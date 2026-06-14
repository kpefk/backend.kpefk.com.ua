import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { LoadDistributionMode } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import type {
  AllTeachersLoadDto,
  HoursPerGroupDto,
  LoadComponentDto,
  MyTeacherLoadDto,
  TeacherLoadDto,
  TeacherLoadEntryDto,
  TeacherLoadSummaryDto,
  TeacherSummaryDto,
  TotalHoursDto,
} from './dto/teacher-load.dto'
import {
  NORM_MAX_DISCIPLINES,
  NORM_TEACHING_HOURS_PER_RATE,
  teachingHoursLimit,
} from './teacher-load.constants'

// ─── Internal types ───────────────────────────────────────────────────────────

/** Плоский рядок, що описує один компонент-семестр для зведення навантаження. */
interface LoadRow {
  teacherId: string | null
  teacher: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
    skillName: string | null
    positionName: string | null
    departmentName: string | null
    /** Ставка (0.25–1.5), з @default(1.0) завжди присутня */
    rate: number
  } | null
  componentId: string
  componentCode: string | null
  componentName: string
  semesterNumber: number
  groupCount: number
  studentCount: number
  lecture: number
  practical: number
  lab: number
  seminar: number
  independent: number
  examPrep: number
  /** Режим розподілу практик/лаб (визначає множник годин). */
  practiceMode: LoadDistributionMode
  labMode: LoadDistributionMode
  /** Кількість підгруп (≥2 → години діляться/множаться). */
  subgroupCount: number
}

@Injectable()
export class TeacherLoadService {
  private readonly logger = new Logger(TeacherLoadService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Генерує педагогічне навантаження для заданого робочого навчального плану.
   *
   * Алгоритм:
   *   1. Завантажує WC → компонент-семестри (з викладачами і компонентами), зберігає порядок.
   *   2. Завантажує активні групи версії та кількість студентів кожної.
   *   3. Для кожного компонент-семестру будує LoadRow з урахуванням правил множення:
   *        лекції × 1 (потоковий), решта × groupCount.
   *   4. Групує по teacherId (null = без призначення).
   *   5. Рахує нормативні сигнали (не блокуючі).
   */
  public async generateByWorkingCurriculum(id: string): Promise<TeacherLoadDto> {
    this.logger.debug(`Generating teacher load for WC id=${id}`)

    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id },
      include: {
        version: {
          select: {
            id: true,
            curriculum: {
              select: {
                educationForm: true,
                entryYear: true,
                program: { select: { name: true, specialty: { select: { code: true, name: true } } } },
              },
            },
          },
        },
        componentTerms: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                skillName: true,
                positionName: true,
                universityFacultyChairFullName: true,
                universityFacultyChairShortName: true,
                rate: true,
              },
            },
            componentTerm: {
              include: {
                component: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    section: { select: { orderIndex: true } },
                    orderIndex: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { componentTerm: { component: { section: { orderIndex: 'asc' } } } },
            { componentTerm: { component: { orderIndex: 'asc' } } },
            { componentTerm: { semesterNumber: 'asc' } },
          ],
        },
      },
    })

    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    const activeGroups = await this.prisma.groupCurriculumAssignment.findMany({
      where: { versionId: wc.versionId, isActive: true },
      select: { groupId: true },
    })

    if (activeGroups.length === 0) {
      this.logger.warn(`WC id=${id}: no active groups — load will have groupCount=0`)
    }

    const groupIds = activeGroups.map((g) => g.groupId)
    const groupCount = groupIds.length

    const studentCount = groupIds.length > 0
      ? await this.prisma.student.count({ where: { groupId: { in: groupIds } } })
      : 0

    const rows = wc.componentTerms.map((wct): LoadRow => {
      const t = wct.teacher
      return {
        teacherId: wct.teacherId,
        teacher: t !== null
          ? {
              id: t.id,
              firstName: t.firstName,
              lastName: t.lastName,
              middleName: t.middleName,
              skillName: t.skillName,
              positionName: t.positionName,
              departmentName:
                t.universityFacultyChairShortName ??
                t.universityFacultyChairFullName ??
                null,
              rate: t.rate.toNumber(),
            }
          : null,
        componentId: wct.componentTerm.component.id,
        componentCode: wct.componentTerm.component.code,
        componentName: wct.componentTerm.component.name,
        semesterNumber: wct.componentTerm.semesterNumber,
        groupCount,
        studentCount,
        lecture: wct.lectureHours,
        practical: wct.practicalHours,
        lab: wct.labHours,
        seminar: wct.seminarHours,
        independent: wct.independentHours,
        examPrep: wct.consultationHours,
        practiceMode: wct.practiceMode,
        labMode: wct.labMode,
        subgroupCount: wct.componentTerm.subgroupCount ?? 1,
      }
    })

    const entries = this.groupAndAggregate(rows)

    return {
      workingCurriculumId: id,
      academicYear: wc.academicYear,
      generatedAt: new Date().toISOString(),
      teachers: entries,
    }
  }

  /**
   * Повертає всі робочі плани на заданий навчальний рік, де вказаний викладач
   * є відповідальним хоча б за один компонент, і генерує зведене навантаження.
   */
  public async generateByTeacher(
    teacherId: string,
    academicYear?: string,
  ): Promise<TeacherLoadDto[]> {
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } })
    if (!teacher) throw new NotFoundException('Викладача не знайдено.')

    const wcIds = await this.prisma.workingCurriculumComponentTerm.findMany({
      where: {
        teacherId,
        ...(academicYear
          ? { workingCurriculum: { academicYear } }
          : {}),
      },
      select: { workingCurriculumId: true },
      distinct: ['workingCurriculumId'],
    })

    const results = await Promise.all(
      wcIds.map(({ workingCurriculumId }) =>
        this.generateByWorkingCurriculum(workingCurriculumId),
      ),
    )
    return results
  }

  /**
   * Навантаження поточного користувача-викладача (для dashboard).
   * Резолвить профіль викладача за userId сесії, агрегує його навантаження
   * по всіх робочих планах (опційно — за навчальний рік).
   */
  public async generateMyLoad(
    userId: string,
    academicYear?: string,
  ): Promise<MyTeacherLoadDto> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      select: { id: true, firstName: true, lastName: true, middleName: true, skillName: true, positionName: true, universityFacultyChairShortName: true, universityFacultyChairFullName: true, rate: true },
    })

    const empty: MyTeacherLoadDto = {
      teacher: null,
      academicYear: academicYear ?? null,
      totalTeachingHours: 0,
      teachingHoursLimit: 0,
      teachingHoursExceeded: false,
      disciplineCount: 0,
      plans: [],
    }
    if (!teacher) return empty

    const loads = await this.generateByTeacher(teacher.id, academicYear)
    if (loads.length === 0) {
      return { ...empty, teacher: this.teacherToSummary(teacher), teachingHoursLimit: teachingHoursLimit(teacher.rate.toNumber()) }
    }

    // Людські назви планів.
    const labels = await this.buildWcLabels(loads.map((l) => l.workingCurriculumId))

    let total = 0
    const disciplines = new Set<string>()
    let summary: TeacherSummaryDto | null = null
    const plans = []

    for (const load of loads) {
      const entry = load.teachers.find((e) => e.teacher?.id === teacher.id)
      if (!entry?.teacher) continue
      summary = entry.teacher
      total += entry.summary.totalTeachingHours
      entry.components.forEach((c) => disciplines.add(c.componentName))
      plans.push({
        workingCurriculumId: load.workingCurriculumId,
        academicYear: load.academicYear,
        label: labels.get(load.workingCurriculumId) ?? load.academicYear,
        totalTeachingHours: entry.summary.totalTeachingHours,
        components: entry.components,
      })
    }

    const rate = summary?.rate ?? teacher.rate.toNumber()
    const limit = teachingHoursLimit(rate)
    return {
      teacher: summary ?? this.teacherToSummary(teacher),
      academicYear: academicYear ?? null,
      totalTeachingHours: total,
      teachingHoursLimit: limit,
      teachingHoursExceeded: total > limit,
      disciplineCount: disciplines.size,
      plans,
    }
  }

  /**
   * Зведене навантаження по ВСІХ викладачах за навчальний рік (для керівництва).
   * Агрегує результати по всіх робочих планах року.
   */
  public async generateAllTeachersSummary(
    academicYear: string,
  ): Promise<AllTeachersLoadDto> {
    const wcs = await this.prisma.workingCurriculum.findMany({
      where: { academicYear },
      select: { id: true },
    })

    const loads = await Promise.all(
      wcs.map((wc) => this.generateByWorkingCurriculum(wc.id)),
    )

    interface Acc {
      teacher: TeacherSummaryDto
      hours: number
      disciplines: Set<string>
      wcIds: Set<string>
    }
    const acc = new Map<string, Acc>()
    let unassignedComponents = 0

    for (const load of loads) {
      for (const entry of load.teachers) {
        if (!entry.teacher) {
          unassignedComponents += entry.components.length
          continue
        }
        const id = entry.teacher.id
        if (!acc.has(id)) {
          acc.set(id, { teacher: entry.teacher, hours: 0, disciplines: new Set(), wcIds: new Set() })
        }
        const a = acc.get(id)!
        a.hours += entry.summary.totalTeachingHours
        entry.components.forEach((c) => a.disciplines.add(c.componentName))
        a.wcIds.add(load.workingCurriculumId)
      }
    }

    const rows = [...acc.values()]
      .map((a) => {
        const limit = teachingHoursLimit(a.teacher.rate)
        return {
          teacher: a.teacher,
          totalTeachingHours: a.hours,
          teachingHoursLimit: limit,
          teachingHoursExceeded: a.hours > limit,
          disciplineCount: a.disciplines.size,
          workingCurriculumCount: a.wcIds.size,
        }
      })
      .sort((x, y) => y.totalTeachingHours - x.totalTeachingHours)

    return {
      academicYear,
      generatedAt: new Date().toISOString(),
      rows,
      unassignedComponents,
    }
  }

  /** Будує мапу workingCurriculumId → людська назва. */
  private async buildWcLabels(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map()
    const wcs = await this.prisma.workingCurriculum.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        academicYear: true,
        version: {
          select: {
            curriculum: {
              select: { program: { select: { name: true, specialty: { select: { code: true } } } } },
            },
          },
        },
      },
    })
    return new Map(
      wcs.map((wc) => {
        const prog = wc.version.curriculum.program
        return [wc.id, `${prog.specialty.code} ${prog.name} (${wc.academicYear})`]
      }),
    )
  }

  private teacherToSummary(t: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
    skillName: string | null
    positionName: string | null
    universityFacultyChairShortName: string | null
    universityFacultyChairFullName: string | null
    rate: { toNumber(): number }
  }): TeacherSummaryDto {
    return {
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      middleName: t.middleName,
      skillName: t.skillName,
      positionName: t.positionName,
      departmentName: t.universityFacultyChairShortName ?? t.universityFacultyChairFullName ?? null,
      rate: t.rate.toNumber(),
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private groupAndAggregate(rows: LoadRow[]): TeacherLoadEntryDto[] {
    const groupOrder: Array<string | null> = []
    const grouped = new Map<string | null, LoadRow[]>()

    for (const row of rows) {
      const key = row.teacherId
      if (!grouped.has(key)) {
        grouped.set(key, [])
        groupOrder.push(key)
      }
      grouped.get(key)!.push(row)
    }

    const sortedKeys = [
      ...groupOrder.filter((k): k is string => k !== null),
      ...(groupOrder.includes(null) ? [null] : []),
    ]

    return sortedKeys.map((key) => {
      const groupRows = grouped.get(key) ?? []
      const teacher = groupRows[0]?.teacher ?? null
      const components = groupRows.map((r) => this.buildComponent(r))
      const summary = this.buildSummary(groupRows, components)

      return {
        teacher: teacher !== null ? this.mapTeacherSummary(teacher) : null,
        summary,
        components,
      }
    })
  }

  private buildComponent(row: LoadRow): LoadComponentDto {
    const {
      lecture, practical, lab, seminar, independent, examPrep,
      groupCount, practiceMode, labMode, subgroupCount,
    } = row
    const practicalLab = practical + lab

    const hoursPerGroup: HoursPerGroupDto = {
      lecture,
      practicalLab,
      seminar,
      independent,
      examPrep,
    }

    // Множники узгоджені з gener() призначень:
    //  • лекції/семінари/консультації/СПРС — завжди потік (×1);
    //  • практики/лаб — ×groupCount лише в режимі PER_GROUP;
    //  • поділ на підгрупи (≥2) множить години практик/лаб (кожна підгрупа окремо).
    const sub = subgroupCount >= 2 ? subgroupCount : 1
    const practiceMul = (practiceMode === 'PER_GROUP' ? groupCount : 1) * sub
    const labMul = (labMode === 'PER_GROUP' ? groupCount : 1) * sub
    const practicalLabTotal = practical * practiceMul + lab * labMul

    const totalHours: TotalHoursDto = {
      lecture: lecture,                 // потік ×1
      practicalLab: practicalLabTotal,  // ×groupCount (PER_GROUP) ×subgroups
      seminar: seminar,                 // потік ×1
      independent: independent,         // потік ×1
      examPrep: examPrep,               // потік ×1
      subtotal: lecture + practicalLabTotal + seminar + independent + examPrep,
    }

    return {
      componentCode: row.componentCode,
      componentName: row.componentName,
      semesterNumber: row.semesterNumber,
      groupCount: row.groupCount,
      studentCount: row.studentCount,
      hoursPerGroup,
      totalHours,
    }
  }

  private buildSummary(
    rows: LoadRow[],
    components: LoadComponentDto[],
  ): TeacherLoadSummaryDto {
    const totalTeachingHours = components.reduce(
      (s, c) =>
        s +
        c.totalHours.lecture +
        c.totalHours.practicalLab +
        c.totalHours.seminar +
        c.totalHours.independent +
        c.totalHours.examPrep,
      0,
    )

    // Ставка береться з першого рядка групи (всі рядки одного викладача)
    const rate = rows[0]?.teacher?.rate ?? 1.0
    const limit = teachingHoursLimit(rate)
    const teachingHoursExceeded = rows[0]?.teacher !== null
      ? totalTeachingHours > limit
      : false

    const disciplineCount = new Set(rows.map((r) => r.componentId)).size

    const warnings: string[] = []
    if (teachingHoursExceeded) {
      warnings.push(
        `Перевищено ліміт навчального навантаження ${limit} год/рік ` +
        `(${NORM_TEACHING_HOURS_PER_RATE} год × ${rate} ставки; фактично: ${totalTeachingHours} год). ` +
        `Ст. 60 Закону №2745-VIII.`,
      )
    }
    if (disciplineCount > NORM_MAX_DISCIPLINES) {
      warnings.push(
        `Більше ${NORM_MAX_DISCIPLINES} дисциплін (фактично: ${disciplineCount}). ` +
        `Рекомендований норматив Наказу МОН №686.`,
      )
    }

    return {
      totalTeachingHours,
      teachingHoursLimit: limit,
      teachingHoursExceeded,
      disciplineCount,
      warnings,
    }
  }

  private mapTeacherSummary(t: NonNullable<LoadRow['teacher']>): TeacherSummaryDto {
    return {
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      middleName: t.middleName,
      skillName: t.skillName,
      positionName: t.positionName,
      departmentName: t.departmentName,
      rate: t.rate,
    }
  }
}
