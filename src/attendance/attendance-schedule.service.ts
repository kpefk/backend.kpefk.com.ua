import { Injectable } from '@nestjs/common'

import type { Prisma, WeekParity } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import {
  academicYearOf,
  entryVisibleOnDate,
  isoWeekday,
  semesterMatchesTerm,
  termOf,
  weekParityOf,
} from './attendance.calendar'

/** Заняття, що фактично відбувається на конкретну дату (після парності/замін). */
export interface ResolvedLesson {
  scheduleEntryId: string
  groupId: string
  groupName: string
  academicYear: string
  semesterNumber: number
  curriculumComponentTermId: string
  componentCode: string | null
  subjectName: string
  slotNumber: number
  weekParity: WeekParity
  subgroupNumber: number | null
  /** Фактичний викладач (із урахуванням заміни). */
  teacherId: string
  classroom: { id: string; number: string; name: string } | null
  onlineUrl: string | null
  /** true, якщо поточний викладач — заміняючий (TEACHER_CHANGE). */
  isSubstituteTeacher: boolean
}

const ENTRY_INCLUDE = {
  schedule: {
    select: {
      academicYear: true,
      semesterNumber: true,
      groupId: true,
      group: { select: { name: true } },
    },
  },
  curriculumComponentTerm: {
    select: { component: { select: { code: true, name: true } } },
  },
  classroom: { select: { id: true, number: true, name: true } },
} satisfies Prisma.ScheduleEntryInclude

type EntryRow = Prisma.ScheduleEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>
type SubRow = Prisma.ScheduleSubstitutionGetPayload<{
  include: { replacementClassroom: { select: { id: true; number: true; name: true } } }
}>

@Injectable()
export class AttendanceScheduleService {
  public constructor(private readonly prisma: PrismaService) {}

  /** Заняття викладача на дату: власні + ті, де він заміняючий. */
  public async resolveForTeacher(
    teacherId: string,
    date: Date,
  ): Promise<ResolvedLesson[]> {
    const ctx = this.dateContext(date)
    if (!ctx) return []

    const { weekday, academicYear, term, dateParity, dayStart, dayEnd } = ctx

    // Власні заняття цього дня тижня в опублікованих розкладах поточного року.
    const ownEntries = await this.prisma.scheduleEntry.findMany({
      where: {
        teacherId,
        dayOfWeek: weekday,
        schedule: { academicYear, status: 'PUBLISHED' },
      },
      include: ENTRY_INCLUDE,
    })

    // Заміни на цю дату для відповідних занять.
    const ownSubs = await this.loadSubs(
      ownEntries.map((e) => e.id),
      dayStart,
      dayEnd,
    )
    const lessons: ResolvedLesson[] = []
    for (const entry of ownEntries) {
      const lesson = this.materialize(entry, ownSubs.get(entry.id), term, dateParity)
      // Власне заняття зникає зі списку, якщо його передали іншому викладачу.
      if (lesson && lesson.teacherId === teacherId) lessons.push(lesson)
    }

    // Заняття, де цей викладач — заміняючий на цю дату.
    const asReplacement = await this.prisma.scheduleSubstitution.findMany({
      where: {
        type: 'TEACHER_CHANGE',
        replacementTeacherId: teacherId,
        date: { gte: dayStart, lt: dayEnd },
      },
      include: {
        entry: { include: ENTRY_INCLUDE },
        replacementClassroom: { select: { id: true, number: true, name: true } },
      },
    })
    for (const sub of asReplacement) {
      const lesson = this.materialize(sub.entry, sub, term, dateParity)
      if (lesson) lessons.push(lesson)
    }

    return this.sortBySlot(lessons)
  }

  /** Усі заняття групи на дату (для куратора/керівництва). */
  public async resolveForGroup(
    groupId: string,
    date: Date,
  ): Promise<ResolvedLesson[]> {
    const ctx = this.dateContext(date)
    if (!ctx) return []
    const { weekday, academicYear, term, dateParity, dayStart, dayEnd } = ctx

    const entries = await this.prisma.scheduleEntry.findMany({
      where: {
        dayOfWeek: weekday,
        schedule: { groupId, academicYear, status: 'PUBLISHED' },
      },
      include: ENTRY_INCLUDE,
    })
    const subs = await this.loadSubs(entries.map((e) => e.id), dayStart, dayEnd)

    const lessons: ResolvedLesson[] = []
    for (const entry of entries) {
      const lesson = this.materialize(entry, subs.get(entry.id), term, dateParity)
      if (lesson) lessons.push(lesson)
    }
    return this.sortBySlot(lessons)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private dateContext(date: Date): {
    weekday: number
    academicYear: string
    term: 1 | 2
    dateParity: WeekParity
    dayStart: Date
    dayEnd: Date
  } | null {
    const weekday = isoWeekday(date)
    if (weekday > 5) return null // субота/неділя — занять немає
    const academicYear = academicYearOf(date)
    const term = termOf(date)
    const dateParity = weekParityOf(date, academicYear, term)
    const dayStart = date
    const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    return { weekday, academicYear, term, dateParity, dayStart, dayEnd }
  }

  private async loadSubs(
    entryIds: string[],
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Map<string, SubRow>> {
    if (entryIds.length === 0) return new Map()
    const subs = await this.prisma.scheduleSubstitution.findMany({
      where: { entryId: { in: entryIds }, date: { gte: dayStart, lt: dayEnd } },
      include: {
        replacementClassroom: { select: { id: true, number: true, name: true } },
      },
    })
    return new Map(subs.map((s) => [s.entryId, s]))
  }

  /** Будує ResolvedLesson з урахуванням парності/семестру/заміни; null = не цей день. */
  private materialize(
    entry: EntryRow,
    sub: SubRow | undefined,
    term: 1 | 2,
    dateParity: WeekParity,
  ): ResolvedLesson | null {
    if (!semesterMatchesTerm(entry.schedule.semesterNumber, term)) return null
    if (!entryVisibleOnDate(entry.weekParity, dateParity)) return null
    if (sub?.type === 'CANCELLED') return null

    const isTeacherChange = sub?.type === 'TEACHER_CHANGE' && !!sub.replacementTeacherId
    const teacherId = isTeacherChange
      ? (sub.replacementTeacherId as string)
      : entry.teacherId
    if (!teacherId) return null // без призначеного викладача заняття не ведеться

    const classroom =
      sub?.type === 'ROOM_CHANGE' && sub.replacementClassroom
        ? sub.replacementClassroom
        : entry.classroom

    const slotNumber = sub?.type === 'MOVED' && sub.newSlotNumber ? sub.newSlotNumber : entry.slotNumber

    return {
      scheduleEntryId: entry.id,
      groupId: entry.schedule.groupId,
      groupName: entry.schedule.group.name,
      academicYear: entry.schedule.academicYear,
      semesterNumber: entry.schedule.semesterNumber,
      curriculumComponentTermId: entry.curriculumComponentTermId,
      componentCode: entry.curriculumComponentTerm.component.code,
      subjectName: entry.curriculumComponentTerm.component.name,
      slotNumber,
      weekParity: entry.weekParity,
      subgroupNumber: entry.subgroupNumber,
      teacherId,
      classroom,
      onlineUrl: entry.onlineUrl,
      isSubstituteTeacher: isTeacherChange,
    }
  }

  private sortBySlot(lessons: ResolvedLesson[]): ResolvedLesson[] {
    return lessons.sort(
      (a, b) => a.slotNumber - b.slotNumber || a.groupName.localeCompare(b.groupName, 'uk'),
    )
  }
}
