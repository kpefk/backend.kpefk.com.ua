import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import type { LessonType, Prisma, WeekParity } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import type {
  GenerateScheduleDto,
  GenerateScheduleResultDto,
} from './dto/schedule.dto'
import {
  DEFAULT_TEACHING_WEEKS,
  HOURS_PER_LESSON,
  LESSON_TYPE_LABELS,
  SLOTS_PER_DAY,
  WORKING_DAYS,
} from './schedule.constants'
import {
  expandParity,
  resolveTeacher,
  SUBJECT_TEACHER_INCLUDE,
  type SubjectTeacherRow,
} from './schedule.helpers'
import { ScheduleService } from './schedule.service'
import { ScheduleSettingsService } from './schedule-settings.service'

// Поле годин у робочому терміні → тип заняття + (опційно) поле тижневих годин.
const TYPE_HOUR_FIELDS = [
  { lessonType: 'LECTURE', hoursField: 'lectureHours', weeklyField: 'weeklyLectureHours' },
  { lessonType: 'PRACTICE', hoursField: 'practicalHours', weeklyField: 'weeklyPracticalHours' },
  { lessonType: 'LAB', hoursField: 'labHours', weeklyField: null },
  { lessonType: 'SEMINAR', hoursField: 'seminarHours', weeklyField: null },
  { lessonType: 'CONSULTATION', hoursField: 'consultationHours', weeklyField: null },
] as const

/** Одне під-заняття всередині юніта (для підгруп — окреме на підгрупу). */
interface SubLesson {
  subgroupNumber: number | null
  teacherId: string | null
  teacherMissing: boolean
}

/** Юніт = одне розташування заняття в 2-тижневому циклі (може бути паралельні підгрупи). */
interface PlacementUnit {
  componentTermId: string
  subjectName: string
  lessonType: LessonType
  /** true = одна пара на 2 тижні (ставиться як ODD або EVEN — чисельник/знаменник). */
  isHalf: boolean
  subLessons: SubLesson[]
}

interface PlannedEntry {
  dayOfWeek: number
  slotNumber: number
  weekParity: WeekParity
  lessonType: LessonType
  subgroupNumber: number | null
  curriculumComponentTermId: string
  teacherId: string | null
  classroomId: string | null
}

@Injectable()
export class ScheduleGeneratorService {
  private readonly logger = new Logger(ScheduleGeneratorService.name)

  public constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
    private readonly settingsService: ScheduleSettingsService,
  ) {}

  public async generate(
    dto: GenerateScheduleDto,
    _userId: string,
  ): Promise<GenerateScheduleResultDto> {
    const { groupId, academicYear, semesterNumber } = dto
    const warnings: string[] = []

    const workingCurriculumId = await this.scheduleService.resolveWorkingCurriculumId(
      groupId,
      academicYear,
    )
    if (!workingCurriculumId) {
      throw new NotFoundException(
        'Для цієї групи немає робочого навчального плану на обраний рік.',
      )
    }

    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id: workingCurriculumId },
      select: {
        id: true,
        versionId: true,
        version: { select: { curriculum: { select: { educationForm: true } } } },
      },
    })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    // Ліміт пар на день за формою навчання (ТЗ §3.4). null = без обмеження
    // (обмежено лише к-стю визначених слотів дзвінків).
    const formLimit = await this.settingsService.maxPairsForForm(
      wc.version.curriculum.educationForm,
    )
    const maxPairs = formLimit ?? SLOTS_PER_DAY

    // ── Джерела даних ──────────────────────────────────────────────────────
    const workingTerms = await this.prisma.workingCurriculumComponentTerm.findMany({
      where: { workingCurriculumId, componentTerm: { semesterNumber } },
      include: {
        componentTerm: {
          include: {
            component: { select: { name: true, orderIndex: true } },
          },
        },
      },
    })
    if (workingTerms.length === 0) {
      warnings.push(
        `У РНП немає дисциплін для семестру ${semesterNumber}. Розклад порожній.`,
      )
    }

    const subjects: SubjectTeacherRow[] =
      await this.prisma.teacherLoadSubjectAssignment.findMany({
        where: { workingCurriculumId },
        include: SUBJECT_TEACHER_INCLUDE,
      })

    const teachingWeeks = await this.resolveTeachingWeeks(wc.versionId, semesterNumber)

    const classrooms = await this.prisma.classroom.findMany({
      select: { id: true },
      orderBy: { number: 'asc' },
    })
    if (classrooms.length === 0) {
      warnings.push('У системі немає аудиторій — заняття створено без аудиторій.')
    }

    // ── Перегенерація: чистимо власні записи групи, чужі лишаємо ─────────────
    const schedule = await this.prisma.schedule.upsert({
      where: {
        groupId_academicYear_semesterNumber: { groupId, academicYear, semesterNumber },
      },
      create: { groupId, workingCurriculumId, academicYear, semesterNumber },
      update: {},
      select: { id: true },
    })
    await this.prisma.scheduleEntry.deleteMany({ where: { scheduleId: schedule.id } })

    // Зайнятість викладачів/аудиторій з ІНШИХ груп цього періоду.
    const otherEntries = await this.prisma.scheduleEntry.findMany({
      where: {
        schedule: { academicYear, semesterNumber },
        scheduleId: { not: schedule.id },
      },
      select: {
        dayOfWeek: true,
        slotNumber: true,
        weekParity: true,
        teacherId: true,
        classroomId: true,
      },
    })

    const groupBusy = new Set<string>()
    const teacherBusy = new Map<string, Set<string>>()
    const classroomBusy = new Map<string, Set<string>>()

    for (const e of otherEntries) {
      const keys = this.weekKeys(e.dayOfWeek, e.slotNumber, e.weekParity)
      if (e.teacherId) this.addKeys(teacherBusy, e.teacherId, keys)
      if (e.classroomId) this.addKeys(classroomBusy, e.classroomId, keys)
    }

    // ── Будуємо юніти ──────────────────────────────────────────────────────
    const units = this.buildUnits(workingTerms, subjects, groupId, teachingWeeks)

    // Щотижневі юніти важче розставити (потрібні обидва тижні) — спочатку.
    units.sort((a, b) => {
      if (a.isHalf !== b.isHalf) return a.isHalf ? 1 : -1
      return b.subLessons.length - a.subLessons.length
    })

    // ── Жадібна розстановка ────────────────────────────────────────────────
    const planned: PlannedEntry[] = []
    const dayLoad = new Map<number, number>(WORKING_DAYS.map((d) => [d, 0]))

    for (const unit of units) {
      const placement = this.placeUnit(
        unit,
        dayLoad,
        groupBusy,
        teacherBusy,
        classroomBusy,
        classrooms.map((c) => c.id),
        maxPairs,
      )
      if (!placement) {
        warnings.push(
          `Не вдалося розставити: ${unit.subjectName} (${LESSON_TYPE_LABELS[unit.lessonType]}).`,
        )
        continue
      }

      const keys = this.weekKeys(placement.day, placement.slot, placement.parity)
      this.addToSet(groupBusy, keys)
      dayLoad.set(placement.day, (dayLoad.get(placement.day) ?? 0) + 1)

      placement.assignments.forEach((a, i) => {
        const sub = unit.subLessons[i]
        if (sub.teacherId) this.addKeys(teacherBusy, sub.teacherId, keys)
        if (a.classroomId) this.addKeys(classroomBusy, a.classroomId, keys)
        if (sub.teacherMissing) {
          warnings.push(
            `Немає викладача в навантаженні: ${unit.subjectName} (${LESSON_TYPE_LABELS[unit.lessonType]}).`,
          )
        }
        if (!a.classroomId && classrooms.length > 0) {
          warnings.push(
            `Немає вільної аудиторії: ${unit.subjectName} (${LESSON_TYPE_LABELS[unit.lessonType]}).`,
          )
        }
        planned.push({
          dayOfWeek: placement.day,
          slotNumber: placement.slot,
          weekParity: placement.parity,
          lessonType: unit.lessonType,
          subgroupNumber: sub.subgroupNumber,
          curriculumComponentTermId: unit.componentTermId,
          teacherId: sub.teacherId,
          classroomId: a.classroomId,
        })
      })
    }

    if (planned.length > 0) {
      await this.prisma.scheduleEntry.createMany({
        data: planned.map((p) => ({ ...p, scheduleId: schedule.id })),
      })
    }
    await this.prisma.schedule.update({
      where: { id: schedule.id },
      data: { generatedAt: new Date() },
    })

    this.logger.log(
      `Generated schedule for group=${groupId} year=${academicYear} sem=${semesterNumber}: ` +
        `${planned.length} entries, ${warnings.length} warnings`,
    )

    return {
      schedule: await this.scheduleService.toScheduleDto(schedule.id),
      warnings: [...new Set(warnings)],
    }
  }

  // ── Units ──────────────────────────────────────────────────────────────────

  private buildUnits(
    workingTerms: Prisma.WorkingCurriculumComponentTermGetPayload<{
      include: {
        componentTerm: { include: { component: { select: { name: true; orderIndex: true } } } }
      }
    }>[],
    subjects: SubjectTeacherRow[],
    groupId: string,
    teachingWeeks: number,
  ): PlacementUnit[] {
    const units: PlacementUnit[] = []

    for (const wt of workingTerms) {
      const subjectName = wt.componentTerm.component.name
      const subgroupCount = wt.subgroupCount >= 2 ? wt.subgroupCount : 1

      for (const { lessonType, hoursField, weeklyField } of TYPE_HOUR_FIELDS) {
        const hours = (wt[hoursField] as number | null) ?? 0
        if (hours <= 0) continue

        const weekly = weeklyField
          ? wt[weeklyField] !== null
            ? Number(wt[weeklyField])
            : null
          : null

        const pairsPerCycle = this.pairsPerCycle(weekly, hours, teachingWeeks)
        const fullCount = Math.floor(pairsPerCycle / 2)
        const halfCount = pairsPerCycle % 2

        const buildSubLessons = (): SubLesson[] => {
          const subLessons: SubLesson[] = []
          for (let i = 0; i < subgroupCount; i++) {
            const subgroupNumber = subgroupCount > 1 ? i + 1 : null
            const teacher = resolveTeacher(
              subjects,
              wt.componentTermId,
              groupId,
              lessonType,
              subgroupNumber,
            )
            subLessons.push({
              subgroupNumber,
              teacherId: teacher?.id ?? null,
              teacherMissing: !teacher,
            })
          }
          return subLessons
        }

        for (let i = 0; i < fullCount; i++) {
          units.push({
            componentTermId: wt.componentTermId,
            subjectName,
            lessonType,
            isHalf: false,
            subLessons: buildSubLessons(),
          })
        }
        if (halfCount) {
          units.push({
            componentTermId: wt.componentTermId,
            subjectName,
            lessonType,
            isHalf: true,
            subLessons: buildSubLessons(),
          })
        }
      }
    }

    return units
  }

  /** Кількість пар у 2-тижневому циклі. */
  private pairsPerCycle(
    weeklyHours: number | null,
    semesterHours: number,
    weeks: number,
  ): number {
    if (weeklyHours && weeklyHours > 0) return Math.max(1, Math.round(weeklyHours))
    if (semesterHours <= 0) return 0
    const totalPairs = Math.ceil(semesterHours / HOURS_PER_LESSON)
    const perWeek = totalPairs / Math.max(1, weeks)
    return Math.max(1, Math.round(perWeek * 2))
  }

  // ── Placement ───────────────────────────────────────────────────────────────

  private placeUnit(
    unit: PlacementUnit,
    dayLoad: Map<number, number>,
    groupBusy: Set<string>,
    teacherBusy: Map<string, Set<string>>,
    classroomBusy: Map<string, Set<string>>,
    classroomIds: string[],
    maxPairs: number,
  ): {
    day: number
    slot: number
    parity: WeekParity
    assignments: { classroomId: string | null }[]
  } | null {
    // Дні в порядку зростання навантаження (рівномірний розподіл).
    const days = [...WORKING_DAYS].sort(
      (a, b) => (dayLoad.get(a) ?? 0) - (dayLoad.get(b) ?? 0) || a - b,
    )

    // Щотижневий юніт → лише EVERY. Половинний → ODD/EVEN.
    // Для половинних спершу «пакуємо» у клітинку, де протилежний тиждень уже зайнято
    // (чисельник+знаменник в одному слоті), потім — у будь-яку вільну.
    const parityOptions: WeekParity[] = unit.isHalf ? ['ODD', 'EVEN'] : ['EVERY']
    const passes: ('pack' | 'any')[] = unit.isHalf ? ['pack', 'any'] : ['any']

    for (const pass of passes) {
      for (const day of days) {
        for (let slot = 1; slot <= maxPairs; slot++) {
          for (const parity of parityOptions) {
            const keys = this.weekKeys(day, slot, parity)
            if (!this.isFree(groupBusy, keys)) continue

            if (pass === 'pack') {
              const opposite = parity === 'ODD' ? 'EVEN' : 'ODD'
              if (!groupBusy.has(`${day}:${slot}:${opposite}`)) continue
            }

            const teacherOk = unit.subLessons.every((s) =>
              s.teacherId ? this.isFree(teacherBusy.get(s.teacherId), keys) : true,
            )
            if (!teacherOk) continue

            const assignments = this.assignClassrooms(
              unit.subLessons.length,
              keys,
              classroomBusy,
              classroomIds,
            )
            if (!assignments) continue

            return { day, slot, parity, assignments }
          }
        }
      }
    }
    return null
  }

  /** Підбирає окрему вільну аудиторію на кожне під-заняття; null = не вистачило. */
  private assignClassrooms(
    count: number,
    keys: string[],
    classroomBusy: Map<string, Set<string>>,
    classroomIds: string[],
  ): { classroomId: string | null }[] | null {
    if (classroomIds.length === 0) {
      return Array.from({ length: count }, () => ({ classroomId: null }))
    }
    const chosen: string[] = []
    for (let i = 0; i < count; i++) {
      const free = classroomIds.find(
        (cid) => !chosen.includes(cid) && this.isFree(classroomBusy.get(cid), keys),
      )
      if (!free) return null
      chosen.push(free)
    }
    return chosen.map((classroomId) => ({ classroomId }))
  }

  // ── Occupancy helpers ────────────────────────────────────────────────────────

  private weekKeys(day: number, slot: number, parity: WeekParity): string[] {
    return expandParity(parity).map((w) => `${day}:${slot}:${w}`)
  }

  private isFree(set: Set<string> | undefined, keys: string[]): boolean {
    if (!set) return true
    return keys.every((k) => !set.has(k))
  }

  private addToSet(set: Set<string>, keys: string[]): void {
    for (const k of keys) set.add(k)
  }

  private addKeys(map: Map<string, Set<string>>, id: string, keys: string[]): void {
    let set = map.get(id)
    if (!set) {
      set = new Set<string>()
      map.set(id, set)
    }
    this.addToSet(set, keys)
  }

  // ── Teaching weeks ───────────────────────────────────────────────────────────

  private async resolveTeachingWeeks(
    versionId: string,
    semesterNumber: number,
  ): Promise<number> {
    const count = await this.prisma.academicCalendarEntry.count({
      where: { versionId, semesterNumber, weekType: 'INSTRUCTION' },
    })
    return count > 0 ? count : DEFAULT_TEACHING_WEEKS
  }
}
