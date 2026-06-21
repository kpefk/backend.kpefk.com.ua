import { Injectable, NotFoundException } from '@nestjs/common'

import type { WeekParity } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { BELL_TIMES, HOMEROOM_BELL, LESSON_TYPE_LABELS } from './schedule.constants'
import { ENTRY_INCLUDE, teacherShort } from './schedule.helpers'

/**
 * Експорт розкладу групи в iCalendar (.ics) (ТЗ §3.11).
 * Кожне заняття розгортається в RRULE на тижнях навчання семестру.
 * Парність (чисельник/знаменник) кодуємо інтервалом 2 тижні.
 */
@Injectable()
export class ScheduleExportService {
  public constructor(private readonly prisma: PrismaService) {}

  public async toIcs(
    groupId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<{ filename: string; content: string }> {
    const schedule = await this.prisma.schedule.findUnique({
      where: {
        groupId_academicYear_semesterNumber: { groupId, academicYear, semesterNumber },
      },
      include: { group: true, entries: { include: ENTRY_INCLUDE } },
    })
    if (!schedule) throw new NotFoundException('Розклад не знайдено.')

    // Понеділок першого тижня семестру (орієнтовно 1 вересня / 1 лютого року).
    const startMonday = this.semesterStartMonday(academicYear, semesterNumber)
    const weeks = await this.semesterWeeks(schedule.workingCurriculumId, semesterNumber)

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MyKPEFK//Schedule//UK',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:Розклад ${this.escape(schedule.group.name)} ${academicYear}`,
    ]

    for (const e of schedule.entries) {
      const bell =
        BELL_TIMES.find((b) => b.slot === e.slotNumber) ??
        (e.slotNumber === HOMEROOM_BELL.slot ? HOMEROOM_BELL : null)
      if (!bell) continue

      const { start, count, interval } = this.recurrence(
        startMonday,
        e.dayOfWeek,
        e.weekParity,
        weeks,
      )
      const dtStart = this.withTime(start, bell.start)
      const dtEnd = this.withTime(start, bell.end)
      const summaryParts = [
        e.curriculumComponentTerm.component.name,
        `(${LESSON_TYPE_LABELS[e.lessonType] ?? e.lessonType})`,
      ]
      if (e.subgroupNumber !== null) summaryParts.push(`${e.subgroupNumber} підгр.`)

      const descParts: string[] = []
      if (e.teacher) descParts.push(`Викладач: ${teacherShort(e.teacher)}`)
      if (e.onlineUrl) descParts.push(`Онлайн: ${e.onlineUrl}`)

      lines.push(
        'BEGIN:VEVENT',
        `UID:${e.id}@my.kpefk.com.ua`,
        `DTSTAMP:${this.icsDateTime(new Date())}`,
        `DTSTART:${this.icsDateTime(dtStart)}`,
        `DTEND:${this.icsDateTime(dtEnd)}`,
        `RRULE:FREQ=WEEKLY;INTERVAL=${interval};COUNT=${count}`,
        `SUMMARY:${this.escape(summaryParts.join(' '))}`,
      )
      if (descParts.length > 0) {
        lines.push(`DESCRIPTION:${this.escape(descParts.join('\\n'))}`)
      }
      if (e.classroom) lines.push(`LOCATION:${this.escape(`ауд. ${e.classroom.number}`)}`)
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    return {
      filename: `schedule-${schedule.group.name}-${academicYear}-sem${semesterNumber}.ics`,
      content: lines.join('\r\n'),
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Перша дата заняття + к-сть повторів та інтервал тижнів за парністю. */
  private recurrence(
    startMonday: Date,
    dayOfWeek: number,
    parity: WeekParity,
    weeks: number,
  ): { start: Date; count: number; interval: number } {
    const firstWeekOffset = parity === 'EVEN' ? 1 : 0
    const interval = parity === 'EVERY' ? 1 : 2
    const start = this.addDays(startMonday, firstWeekOffset * 7 + (dayOfWeek - 1))
    const count =
      parity === 'EVERY' ? weeks : Math.ceil((weeks - firstWeekOffset) / 2)
    return { start, count: Math.max(1, count), interval }
  }

  private async semesterWeeks(
    workingCurriculumId: string,
    semesterNumber: number,
  ): Promise<number> {
    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id: workingCurriculumId },
      select: { versionId: true },
    })
    if (!wc) return 16
    const count = await this.prisma.academicCalendarEntry.count({
      where: { versionId: wc.versionId, semesterNumber, weekType: 'INSTRUCTION' },
    })
    return count > 0 ? count : 16
  }

  /** Орієнтовний понеділок початку семестру за навчальним роком. */
  private semesterStartMonday(academicYear: string, semesterNumber: number): Date {
    const startYear = Number(academicYear.split('-')[0]) || new Date().getFullYear()
    // Непарний семестр — вересень того ж року; парний — лютий наступного.
    const base =
      semesterNumber % 2 === 1
        ? new Date(startYear, 8, 1) // 1 вересня
        : new Date(startYear + 1, 1, 1) // 1 лютого
    const day = base.getDay() // 0=нд..6=сб
    const deltaToMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day
    return this.addDays(base, deltaToMonday)
  }

  private addDays(d: Date, days: number): Date {
    const r = new Date(d)
    r.setDate(r.getDate() + days)
    return r
  }

  private withTime(d: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number)
    const r = new Date(d)
    r.setHours(h, m, 0, 0)
    return r
  }

  private icsDateTime(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0')
    return (
      `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
      `T${p(d.getHours())}${p(d.getMinutes())}00`
    )
  }

  private escape(s: string): string {
    return s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  }
}
