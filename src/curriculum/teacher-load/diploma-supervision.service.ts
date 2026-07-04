import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { activeStudentWhere } from '@/libs/common/active-student'

import {
  AssignDiplomaSupervisionDto,
  AssignDiplomaSupervisionResultDto,
  DiplomaAssignmentDto,
  DiplomaStudentRowDto,
} from './dto/diploma-supervision.dto'
import { NORM_MAX_DIPLOMA_WORKS_PER_TEACHER } from './teacher-load.constants'
import { computeDiplomaSupervisionHoursPerAssignee } from './teacher-load.formulas'

/**
 * Керівництво дипломними роботами (Наказ МОН №686, п.20).
 *
 * На відміну від решти навантаження (прив'язка «група × компонент»), керівництво
 * дипломом — це персональна прив'язка «студент → викладач»: різні студенти однієї
 * групи часто мають різних керівників/консультантів. Тому призначення живуть в
 * окремій таблиці `DiplomaSupervisionAssignment`, поза DRAFT/CONFIRMED workflow
 * `TeacherLoadSubjectAssignment` — завжди активні, подібно до
 * `WorkingCurriculumComponentTerm.teacherId`.
 *
 * Години НЕ зберігаються статично — обчислюються на льоту як 16 / (кількість
 * призначених цьому студенту), щоб не застарівати при зміні складу керівників.
 */
@Injectable()
export class DiplomaSupervisionService {
  private readonly logger = new Logger(DiplomaSupervisionService.name)

  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Повертає студентів груп, прив'язаних до цього робочого плану, разом із поточними
   * призначеннями керівників/консультантів на заданий дипломний компонент-семестр.
   */
  public async listAssignableStudents(
    workingCurriculumId: string,
    componentTermId: string,
  ): Promise<DiplomaStudentRowDto[]> {
    const wc = await this.prisma.workingCurriculum.findUniqueOrThrow({
      where: { id: workingCurriculumId },
      select: { versionId: true },
    })

    const activeGroups = await this.prisma.groupCurriculumAssignment.findMany({
      where: { versionId: wc.versionId, isActive: true },
      select: { groupId: true },
    })
    const groupIds = activeGroups.map((g) => g.groupId)

    const students = groupIds.length > 0
      ? await this.prisma.student.findMany({
          where: { groupId: { in: groupIds }, ...activeStudentWhere() },
          select: { id: true, personFIO: true },
          orderBy: { personFIO: 'asc' },
        })
      : []

    const assignments = await this.prisma.diplomaSupervisionAssignment.findMany({
      where: { workingCurriculumId, curriculumComponentTermId: componentTermId },
      include: {
        teacher: { select: { lastName: true, firstName: true, middleName: true } },
      },
    })

    const byStudent = new Map<string, typeof assignments>()
    for (const a of assignments) {
      const list = byStudent.get(a.studentId) ?? []
      list.push(a)
      byStudent.set(a.studentId, list)
    }

    return students.map((s): DiplomaStudentRowDto => {
      const studentAssignments = byStudent.get(s.id) ?? []
      const hours = computeDiplomaSupervisionHoursPerAssignee(studentAssignments.length)
      const assignmentDtos: DiplomaAssignmentDto[] = studentAssignments.map((a) => ({
        id: a.id,
        teacherId: a.teacherId,
        teacherName: `${a.teacher.lastName} ${a.teacher.firstName}${a.teacher.middleName ? ` ${a.teacher.middleName}` : ''}`,
        role: a.role,
        hours,
      }))
      return { studentId: s.id, studentName: s.personFIO, assignments: assignmentDtos }
    })
  }

  /**
   * Призначає керівника чи консультанта студенту на дипломний компонент-семестр.
   * [SOFT WARN] якщо викладач-керівник уже має ≥ NORM_MAX_DIPLOMA_WORKS_PER_TEACHER
   * призначень цього навчального року (Наказ МОН №686 п.20: "до 8 робіт на керівника").
   */
  public async assign(
    dto: AssignDiplomaSupervisionDto,
    actorUserId: string,
  ): Promise<AssignDiplomaSupervisionResultDto> {
    const wc = await this.prisma.workingCurriculum.findUniqueOrThrow({
      where: { id: dto.workingCurriculumId },
      select: { academicYear: true },
    })

    try {
      await this.prisma.diplomaSupervisionAssignment.create({
        data: {
          studentId: dto.studentId,
          curriculumComponentTermId: dto.curriculumComponentTermId,
          workingCurriculumId: dto.workingCurriculumId,
          academicYear: wc.academicYear,
          role: dto.role,
          teacherId: dto.teacherId,
          assignedById: actorUserId,
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Цей викладач вже призначений цьому студенту.')
      }
      throw err
    }

    const warnings: string[] = []
    if (dto.role === 'SUPERVISOR') {
      const count = await this.prisma.diplomaSupervisionAssignment.count({
        where: { teacherId: dto.teacherId, academicYear: wc.academicYear, role: 'SUPERVISOR' },
      })
      if (count > NORM_MAX_DIPLOMA_WORKS_PER_TEACHER) {
        warnings.push(
          `Викладач керує ${count} дипломними роботами (рекомендований максимум — ` +
          `${NORM_MAX_DIPLOMA_WORKS_PER_TEACHER}, Наказ МОН №686 п.20).`,
        )
      }
    }

    this.logger.log(
      `Diploma supervision assigned: student=${dto.studentId} term=${dto.curriculumComponentTermId} ` +
      `teacher=${dto.teacherId} role=${dto.role}`,
    )
    return { warnings }
  }

  /** Знімає персональне призначення керівника/консультанта. */
  public async unassign(id: string): Promise<void> {
    await this.prisma.diplomaSupervisionAssignment.delete({ where: { id } })
  }

  /**
   * Сумарні години керівництва дипломами для викладачів **у межах одного робочого
   * плану** (для звітного шару `TeacherLoadService` — саме так уникаємо подвійного
   * підрахунку, коли викладач фігурує в кількох робочих планах того самого року).
   */
  public async getTeachersDiplomaHoursByWorkingCurriculum(
    teacherIds: string[],
    workingCurriculumId: string,
  ): Promise<Map<string, number>> {
    return this.aggregateDiplomaHours(teacherIds, { workingCurriculumId })
  }

  /**
   * Сумарні години керівництва дипломами для викладачів **за весь навчальний рік,
   * незалежно від робочого плану** (для hard-block перевірки ліміту 720 год —
   * Ст. 60 Закону №2745-VIII враховує повне навантаження викладача за рік).
   *
   * Якщо `teacherIds` не передано — рахує ДЛЯ ВСІХ викладачів з призначеннями цього
   * року (важливо для hard-block: викладач може мати лише дипломне керівництво,
   * без жодного звичайного заняття, і тому не потрапити в попередньо зібраний список).
   */
  public async getTeachersDiplomaHoursByAcademicYear(
    academicYear: string,
    teacherIds?: string[],
  ): Promise<Map<string, number>> {
    if (teacherIds === undefined) {
      const distinct = await this.prisma.diplomaSupervisionAssignment.findMany({
        where: { academicYear },
        distinct: ['teacherId'],
        select: { teacherId: true },
      })
      teacherIds = distinct.map((d) => d.teacherId)
    }
    return this.aggregateDiplomaHours(teacherIds, { academicYear })
  }

  /**
   * Спільна логіка агрегації: для кожного призначення викладача рахує 16 / (кількість
   * усіх призначених тому самому студенту+терміну в межах того самого scope) і сумує.
   */
  private async aggregateDiplomaHours(
    teacherIds: string[],
    scope: { workingCurriculumId: string } | { academicYear: string },
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    if (teacherIds.length === 0) return result

    const teacherAssignments = await this.prisma.diplomaSupervisionAssignment.findMany({
      where: { teacherId: { in: teacherIds }, ...scope },
      select: { teacherId: true, studentId: true, curriculumComponentTermId: true },
    })
    if (teacherAssignments.length === 0) return result

    // Скільки всього людей призначено на кожен (studentId, componentTermId) — для формули 16/N.
    const allForPairs = await this.prisma.diplomaSupervisionAssignment.findMany({
      where: {
        ...scope,
        OR: teacherAssignments.map((a) => ({
          studentId: a.studentId,
          curriculumComponentTermId: a.curriculumComponentTermId,
        })),
      },
      select: { studentId: true, curriculumComponentTermId: true },
    })

    const assigneeCountByPair = new Map<string, number>()
    for (const r of allForPairs) {
      const key = `${r.studentId}:${r.curriculumComponentTermId}`
      assigneeCountByPair.set(key, (assigneeCountByPair.get(key) ?? 0) + 1)
    }

    for (const a of teacherAssignments) {
      const key = `${a.studentId}:${a.curriculumComponentTermId}`
      const hours = computeDiplomaSupervisionHoursPerAssignee(assigneeCountByPair.get(key) ?? 1)
      result.set(a.teacherId, (result.get(a.teacherId) ?? 0) + hours)
    }

    return result
  }
}
