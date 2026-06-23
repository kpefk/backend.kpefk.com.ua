import type { WeekParity } from '@prisma/client'

/**
 * Чисті функції календаря для журналу: визначення навчального року, семестру
 * (осінній/весняний), парності тижня (чисельник/знаменник) для конкретної дати.
 *
 * Усе рахуємо в UTC (дата приходить як YYYY-MM-DD = UTC-північ), щоб часовий
 * пояс сервера не зміщував день/тиждень.
 */

/** Дата (YYYY-MM-DD) → об'єкт Date на UTC-північ. */
export function parseDateOnly(value: string): Date {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) throw new Error(`Невалідна дата: ${value}`)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

/** День тижня 1=Пн..7=Нд (UTC). */
export function isoWeekday(date: Date): number {
  const d = date.getUTCDay() // 0=Нд..6=Сб
  return d === 0 ? 7 : d
}

/** Навчальний рік для дати: з вересня — поточний-наступний. */
export function academicYearOf(date: Date): string {
  const y = date.getUTCFullYear()
  return date.getUTCMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

/**
 * Семестр навчального року: 1 = осінній (вересень–січень), 2 = весняний
 * (лютий–серпень). Узгоджено з парністю наскрізного семестру групи
 * (осінь = непарні семестри, весна = парні).
 */
export function termOf(date: Date): 1 | 2 {
  const month = date.getUTCMonth() // 0=Січ
  return month >= 8 || month === 0 ? 1 : 2
}

/** Чи наскрізний семестр групи відповідає семестру навчального року дати. */
export function semesterMatchesTerm(semesterNumber: number, term: 1 | 2): boolean {
  return (semesterNumber % 2 === 1) === (term === 1)
}

/** Понеділок початку семестру: осінь — від 1 вересня, весна — від 1 лютого. */
export function termStartMonday(academicYear: string, term: 1 | 2): Date {
  const startYear = Number(academicYear.split('-')[0]) || new Date().getUTCFullYear()
  const base =
    term === 1
      ? new Date(Date.UTC(startYear, 8, 1)) // 1 вересня
      : new Date(Date.UTC(startYear + 1, 1, 1)) // 1 лютого
  const wd = base.getUTCDay() // 0=Нд..6=Сб
  const deltaToMonday = wd === 0 ? 1 : wd === 1 ? 0 : 8 - wd
  base.setUTCDate(base.getUTCDate() + deltaToMonday)
  return base
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Парність тижня дати: тиждень 1 семестру — чисельник (ODD), наступний —
 * знаменник (EVEN). Узгоджено з насінням RRULE в ICS-експорті.
 */
export function weekParityOf(date: Date, academicYear: string, term: 1 | 2): WeekParity {
  const start = termStartMonday(academicYear, term)
  const weeks = Math.floor((date.getTime() - start.getTime()) / WEEK_MS)
  const idx = weeks < 0 ? 0 : weeks
  return idx % 2 === 0 ? 'ODD' : 'EVEN'
}

/** Чи видиме заняття цієї парності на тижні дати (EVERY — завжди). */
export function entryVisibleOnDate(
  entryParity: WeekParity,
  dateParity: WeekParity,
): boolean {
  return entryParity === 'EVERY' || entryParity === dateParity
}
