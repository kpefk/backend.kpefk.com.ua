import type { LessonType, Prisma, WeekParity } from '@prisma/client'

import { LESSON_CLASSROOM_TYPES } from './schedule.constants'
import type {
  ScheduleClassroomRefDto,
  ScheduleEntryDto,
  ScheduleSubstitutionDto,
  ScheduleTeacherRefDto,
} from './dto/schedule.dto'

// ─── Teacher resolution (з педагогічного навантаження) ────────────────────────

export const TEACHER_MINI = {
  id: true,
  lastName: true,
  firstName: true,
  middleName: true,
} satisfies Prisma.TeacherSelect

export const SUBJECT_TEACHER_INCLUDE = {
  primaryTeacher: { select: TEACHER_MINI },
  lessonAssignments: { include: { overrideTeacher: { select: TEACHER_MINI } } },
} satisfies Prisma.TeacherLoadSubjectAssignmentInclude

export type SubjectTeacherRow = Prisma.TeacherLoadSubjectAssignmentGetPayload<{
  include: typeof SUBJECT_TEACHER_INCLUDE
}>

export type TeacherMini = Prisma.TeacherGetPayload<{ select: typeof TEACHER_MINI }>

/**
 * Резолвить фактичного викладача для (компонент-семестр × тип заняття × підгрупа)
 * з призначень педагогічного навантаження:
 *   effectiveTeacher = lessonOverride ?? subject.primaryTeacher.
 * Перевага subject-у з groupId === groupId, fallback на потоковий (groupId = null).
 */
export function resolveTeacher(
  subjects: SubjectTeacherRow[],
  componentTermId: string,
  groupId: string,
  lessonType: LessonType,
  subgroupNumber: number | null,
): TeacherMini | null {
  const matches = subjects.filter(
    (s) =>
      s.curriculumComponentTermId === componentTermId &&
      (s.groupId === groupId || s.groupId === null),
  )
  if (matches.length === 0) return null
  // Перевага конкретній групі над потоковим записом.
  const subject =
    matches.find((s) => s.groupId === groupId) ?? matches[0]

  const lesson =
    subject.lessonAssignments.find(
      (l) => l.lessonType === lessonType && l.subgroupNumber === subgroupNumber,
    ) ??
    subject.lessonAssignments.find((l) => l.lessonType === lessonType)

  return lesson?.overrideTeacher ?? subject.primaryTeacher ?? null
}

export function teacherMiniRef(t: TeacherMini | null): ScheduleTeacherRefDto | null {
  if (!t) return null
  return {
    id: t.id,
    lastName: t.lastName,
    firstName: t.firstName,
    middleName: t.middleName,
    shortName: teacherShort(t),
  }
}

// ─── Prisma include для рендеру записів ───────────────────────────────────────

export const ENTRY_INCLUDE = {
  teacher: {
    select: { id: true, lastName: true, firstName: true, middleName: true },
  },
  classroom: {
    select: { id: true, number: true, name: true, capacity: true, type: true },
  },
  curriculumComponentTerm: {
    include: { component: { select: { code: true, name: true } } },
  },
  substitutions: {
    include: {
      replacementTeacher: { select: TEACHER_MINI },
      replacementClassroom: { select: { id: true, number: true, name: true } },
    },
    orderBy: { date: 'asc' },
  },
} satisfies Prisma.ScheduleEntryInclude

export type EntryRow = Prisma.ScheduleEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>

// ─── Refs ─────────────────────────────────────────────────────────────────────

export function teacherShort(t: {
  lastName: string
  firstName: string
  middleName: string | null
}): string {
  const i = t.firstName[0] ?? ''
  const p = t.middleName?.[0] ?? ''
  return `${t.lastName} ${i}.${p ? `${p}.` : ''}`.trim()
}

export function toTeacherRef(
  t: EntryRow['teacher'],
): ScheduleTeacherRefDto | null {
  if (!t) return null
  return {
    id: t.id,
    lastName: t.lastName,
    firstName: t.firstName,
    middleName: t.middleName,
    shortName: teacherShort(t),
  }
}

export function toClassroomRef(
  c: EntryRow['classroom'],
): ScheduleClassroomRefDto | null {
  if (!c) return null
  return { id: c.id, number: c.number, name: c.name }
}

// ─── Parity / time overlap ────────────────────────────────────────────────────

/** Розгортає тип тижня у конкретні тижні циклу: EVERY → обидва. */
export function expandParity(p: WeekParity): ('ODD' | 'EVEN')[] {
  if (p === 'ODD') return ['ODD']
  if (p === 'EVEN') return ['EVEN']
  return ['ODD', 'EVEN']
}

/** Чи перетинаються два заняття в часі (день + слот + тиждень). */
export function timeOverlaps(
  a: { dayOfWeek: number; slotNumber: number; weekParity: WeekParity },
  b: { dayOfWeek: number; slotNumber: number; weekParity: WeekParity },
): boolean {
  if (a.dayOfWeek !== b.dayOfWeek || a.slotNumber !== b.slotNumber) return false
  const wa = expandParity(a.weekParity)
  const wb = expandParity(b.weekParity)
  return wa.some((w) => wb.includes(w))
}

// ─── Mapping + conflicts ──────────────────────────────────────────────────────

export function toSubstitutionDto(
  s: EntryRow['substitutions'][number],
): ScheduleSubstitutionDto {
  return {
    id: s.id,
    entryId: s.entryId,
    date: s.date.toISOString(),
    type: s.type,
    newDayOfWeek: s.newDayOfWeek,
    newSlotNumber: s.newSlotNumber,
    replacementTeacher: teacherMiniRef(s.replacementTeacher),
    replacementClassroom: s.replacementClassroom
      ? {
          id: s.replacementClassroom.id,
          number: s.replacementClassroom.number,
          name: s.replacementClassroom.name,
        }
      : null,
    reason: s.reason,
    createdAt: s.createdAt.toISOString(),
  }
}

/** Контекст для розрахунку конфліктів місткості/типу аудиторії (ТЗ §3.7, §3.4). */
export interface MapEntryContext {
  /** Кількість студентів у групі цього розкладу (для перевірки місткості). */
  groupSize?: number
  /**
   * Ліміт пар на день для форми навчання групи (ТЗ §3.4). Якщо група має більше
   * за цей ліміт пар в один день — «зайві» пари позначаються конфліктом.
   */
  maxPairsPerDay?: number
}

/**
 * Будує ScheduleEntryDto з конфліктами. `allPeriodEntries` — усі записи розкладів
 * цього (academicYear + semester) по ВСІХ групах (для конфліктів викладача/аудиторії).
 */
export function mapEntry(
  row: EntryRow,
  scheduleId: string,
  allPeriodEntries: (EntryRow & { scheduleId: string })[],
  ctx: MapEntryContext = {},
): ScheduleEntryDto {
  const conflicts: string[] = []

  for (const other of allPeriodEntries) {
    if (other.id === row.id) continue
    if (!timeOverlaps(row, other)) continue

    if (row.teacherId && other.teacherId === row.teacherId) {
      conflicts.push(
        `Викладач зайнятий: ${row.teacher ? teacherShort(row.teacher) : ''}`.trim(),
      )
    }
    if (row.classroomId && other.classroomId === row.classroomId) {
      conflicts.push(`Аудиторія зайнята: ${row.classroom?.number ?? ''}`.trim())
    }
    // Конфлікт групи: ті самі заняття в одній групі, що не є паралельними підгрупами.
    if (other.scheduleId === scheduleId) {
      const parallelSubgroups =
        row.subgroupNumber !== null &&
        other.subgroupNumber !== null &&
        row.subgroupNumber !== other.subgroupNumber
      if (!parallelSubgroups) {
        conflicts.push('Накладання занять у групі')
      }
    }
  }

  // ── Місткість аудиторії vs розмір групи (ТЗ §3.7) ───────────────────────────
  // Лише для занять усієї групи (підгрупи мають менший фактичний розмір).
  if (
    row.classroom?.capacity != null &&
    ctx.groupSize != null &&
    row.subgroupNumber === null &&
    row.classroom.capacity < ctx.groupSize
  ) {
    conflicts.push(
      `Місткість аудиторії ${row.classroom.number} (${row.classroom.capacity}) ` +
        `менша за розмір групи (${ctx.groupSize})`,
    )
  }

  // ── Тип аудиторії vs вид заняття (ТЗ §3.7) ──────────────────────────────────
  if (row.classroom?.type) {
    const allowed = LESSON_CLASSROOM_TYPES[row.lessonType] ?? []
    if (allowed.length > 0 && !allowed.includes(row.classroom.type)) {
      conflicts.push(
        `Тип аудиторії ${row.classroom.number} не відповідає виду заняття`,
      )
    }
  }

  // ── Ліміт пар на день (ТЗ §3.4) ─────────────────────────────────────────────
  // Рахуємо різні слоти (пари), зайняті ЦІЄЮ групою в цей день; пари понад ліміт
  // (за номером слота) позначаються конфліктом — диспетчер не зможе опублікувати.
  if (ctx.maxPairsPerDay != null) {
    const sameDaySlots = new Set<number>([row.slotNumber])
    for (const other of allPeriodEntries) {
      if (other.scheduleId !== scheduleId) continue
      if (other.dayOfWeek !== row.dayOfWeek) continue
      sameDaySlots.add(other.slotNumber)
    }
    const sorted = [...sameDaySlots].sort((a, b) => a - b)
    const rank = sorted.indexOf(row.slotNumber) + 1
    if (rank > ctx.maxPairsPerDay) {
      conflicts.push(`Перевищено ліміт пар на день (${ctx.maxPairsPerDay})`)
    }
  }

  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    slotNumber: row.slotNumber,
    weekParity: row.weekParity,
    lessonType: row.lessonType,
    subgroupNumber: row.subgroupNumber,
    curriculumComponentTermId: row.curriculumComponentTermId,
    componentCode: row.curriculumComponentTerm.component.code,
    subjectName: row.curriculumComponentTerm.component.name,
    teacher: toTeacherRef(row.teacher),
    classroom: toClassroomRef(row.classroom),
    onlineUrl: row.onlineUrl,
    substitutions: row.substitutions.map(toSubstitutionDto),
    conflicts: [...new Set(conflicts)],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
