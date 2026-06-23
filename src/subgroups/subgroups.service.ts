import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'
import { ScheduleService } from '@/schedule/schedule.service'
import { activeStudentWhere } from '@/libs/common/active-student'

import type {
  AutoSplitDto,
  SetSubgroupsDto,
  SubgroupSplitDto,
  SubgroupSplitQueryDto,
  SubgroupStudentDto,
  SubgroupSubjectDto,
  SubgroupSubjectsQueryDto,
} from './dto/subgroups.dto'

@Injectable()
export class SubgroupsService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
  ) {}

  // ── Subjects that allow subgroup splitting ──────────────────────────────────

  public async listSubjects(
    query: SubgroupSubjectsQueryDto,
  ): Promise<SubgroupSubjectDto[]> {
    const workingCurriculumId = await this.scheduleService.resolveWorkingCurriculumId(
      query.groupId,
      query.academicYear,
    )
    if (!workingCurriculumId) return []

    const workingTerms = await this.prisma.workingCurriculumComponentTerm.findMany({
      where: {
        workingCurriculumId,
        subgroupCount: { gte: 2 },
        componentTerm: { semesterNumber: query.semesterNumber },
      },
      select: {
        subgroupCount: true,
        componentTermId: true,
        componentTerm: {
          select: { component: { select: { code: true, name: true } } },
        },
      },
      orderBy: { componentTerm: { component: { orderIndex: 'asc' } } },
    })
    if (workingTerms.length === 0) return []

    const termIds = workingTerms.map((w) => w.componentTermId)

    const [assignments, activeCount] = await Promise.all([
      this.prisma.studentSubgroup.groupBy({
        by: ['curriculumComponentTermId', 'subgroupNumber'],
        where: { groupId: query.groupId, curriculumComponentTermId: { in: termIds } },
        _count: { _all: true },
      }),
      this.prisma.student.count({
        where: { groupId: query.groupId, ...activeStudentWhere() },
      }),
    ])

    return workingTerms.map((w): SubgroupSubjectDto => {
      const counts = new Array<number>(w.subgroupCount).fill(0)
      let assignedTotal = 0
      for (const a of assignments) {
        if (a.curriculumComponentTermId !== w.componentTermId) continue
        const idx = a.subgroupNumber - 1
        if (idx >= 0 && idx < counts.length) counts[idx] = a._count._all
        assignedTotal += a._count._all
      }
      return {
        componentTermId: w.componentTermId,
        componentCode: w.componentTerm.component.code,
        componentName: w.componentTerm.component.name,
        subgroupCount: w.subgroupCount,
        assignedCounts: counts,
        unassignedCount: Math.max(0, activeCount - assignedTotal),
      }
    })
  }

  // ── Current split for one subject ───────────────────────────────────────────

  public async getSplit(
    componentTermId: string,
    query: SubgroupSplitQueryDto,
  ): Promise<SubgroupSplitDto> {
    const { subgroupCount, componentName } = await this.resolveSubject(
      query.groupId,
      query.academicYear,
      componentTermId,
    )

    const students = await this.prisma.student.findMany({
      where: { groupId: query.groupId, ...activeStudentWhere() },
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    const memberships = await this.prisma.studentSubgroup.findMany({
      where: {
        curriculumComponentTermId: componentTermId,
        studentId: { in: students.map((s) => s.id) },
      },
      select: { studentId: true, subgroupNumber: true },
    })
    const byStudent = new Map(memberships.map((m) => [m.studentId, m.subgroupNumber]))

    const rows: SubgroupStudentDto[] = students.map((s) => ({
      studentId: s.id,
      fullName: s.personFIO,
      subgroupNumber: byStudent.get(s.id) ?? 0,
    }))

    return {
      componentTermId,
      componentName,
      subgroupCount,
      groupId: query.groupId,
      students: rows,
    }
  }

  // ── Replace full split ──────────────────────────────────────────────────────

  public async setSplit(
    componentTermId: string,
    dto: SetSubgroupsDto,
    userId: string,
  ): Promise<SubgroupSplitDto> {
    const { subgroupCount } = await this.resolveSubject(
      dto.groupId,
      dto.academicYear,
      componentTermId,
    )

    const activeIds = await this.activeStudentIds(dto.groupId)

    for (const a of dto.assignments) {
      if (!activeIds.has(a.studentId)) {
        throw new BadRequestException(
          'Студента не знайдено серед активних студентів групи.',
        )
      }
      if (a.subgroupNumber > subgroupCount) {
        throw new BadRequestException(
          `Номер підгрупи ${a.subgroupNumber} перевищує кількість підгруп (${subgroupCount}).`,
        )
      }
    }

    await this.replaceMemberships(componentTermId, dto.groupId, dto.assignments, userId)

    return this.getSplit(componentTermId, {
      groupId: dto.groupId,
      academicYear: dto.academicYear,
    })
  }

  // ── Auto split (sequential, by name list) ───────────────────────────────────

  public async autoSplit(
    componentTermId: string,
    dto: AutoSplitDto,
    userId: string,
  ): Promise<SubgroupSplitDto> {
    const { subgroupCount } = await this.resolveSubject(
      dto.groupId,
      dto.academicYear,
      componentTermId,
    )
    if (dto.subgroupCount > subgroupCount) {
      throw new BadRequestException(
        `РНП передбачає ${subgroupCount} підгруп(и), не ${dto.subgroupCount}.`,
      )
    }

    const students = await this.prisma.student.findMany({
      where: { groupId: dto.groupId, ...activeStudentWhere() },
      select: { id: true },
      orderBy: { personFIO: 'asc' },
    })

    // Рівномірний поділ за списком: студенти діляться на N послідовних блоків.
    const perGroup = Math.ceil(students.length / dto.subgroupCount)
    const assignments = students.map((s, i) => ({
      studentId: s.id,
      subgroupNumber: Math.min(dto.subgroupCount, Math.floor(i / perGroup) + 1),
    }))

    await this.replaceMemberships(componentTermId, dto.groupId, assignments, userId)

    return this.getSplit(componentTermId, {
      groupId: dto.groupId,
      academicYear: dto.academicYear,
    })
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Кількість підгруп і назва дисципліни з РНП групи на рік; кидає 404 якщо немає. */
  private async resolveSubject(
    groupId: string,
    academicYear: string,
    componentTermId: string,
  ): Promise<{ subgroupCount: number; componentName: string }> {
    const workingCurriculumId = await this.scheduleService.resolveWorkingCurriculumId(
      groupId,
      academicYear,
    )
    if (!workingCurriculumId) {
      throw new NotFoundException(
        'Для цієї групи немає робочого навчального плану на обраний рік.',
      )
    }
    const wt = await this.prisma.workingCurriculumComponentTerm.findFirst({
      where: { workingCurriculumId, componentTermId },
      select: {
        subgroupCount: true,
        componentTerm: { select: { component: { select: { name: true } } } },
      },
    })
    if (!wt) {
      throw new NotFoundException('Дисципліну не знайдено в РНП цієї групи.')
    }
    return {
      subgroupCount: Math.max(1, wt.subgroupCount),
      componentName: wt.componentTerm.component.name,
    }
  }

  private async activeStudentIds(groupId: string): Promise<Set<string>> {
    const rows = await this.prisma.student.findMany({
      where: { groupId, ...activeStudentWhere() },
      select: { id: true },
    })
    return new Set(rows.map((r) => r.id))
  }

  /** Атомарно перезаписує членство підгруп для (дисципліна × група). */
  private async replaceMemberships(
    componentTermId: string,
    groupId: string,
    assignments: { studentId: string; subgroupNumber: number }[],
    userId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.studentSubgroup.deleteMany({
        where: { curriculumComponentTermId: componentTermId, groupId },
      }),
      ...(assignments.length > 0
        ? [
            this.prisma.studentSubgroup.createMany({
              data: assignments.map((a) => ({
                curriculumComponentTermId: componentTermId,
                groupId,
                studentId: a.studentId,
                subgroupNumber: a.subgroupNumber,
                assignedById: userId,
              })),
            }),
          ]
        : []),
    ])
  }
}
