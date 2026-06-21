/**
 * Константи розкладу занять КПЕФК.
 *
 * Розклад дзвінків та робочі дні є сталими для закладу. Якщо в майбутньому
 * знадобиться редагування — їх можна винести в окрему таблицю налаштувань.
 */

/** Один акад. слот ("пара") триває 2 академічні години. */
export const HOURS_PER_LESSON = 2

/** Робочі дні тижня: 1 = Понеділок ... 5 = П'ятниця. */
export const WORKING_DAYS = [1, 2, 3, 4, 5] as const

/**
 * Кількість навчальних пар у дні за замовчуванням (без виховної години).
 * Реальний ліміт береться з ScheduleSettings (ТЗ §3.4) — це лише fallback.
 */
export const SLOTS_PER_DAY = 4

/**
 * Сумісність типу аудиторії з видом заняття (ТЗ §3.7).
 * Якщо тип аудиторії заданий і його немає у списку дозволених для виду
 * заняття — це колізія «невідповідність типу аудиторії типу заняття».
 * Порожній масив = підходить будь-яка аудиторія (CONSULTATION, SPRS).
 */
export const LESSON_CLASSROOM_TYPES: Record<string, readonly string[]> = {
  LECTURE: ['LECTURE', 'OTHER'],
  PRACTICE: ['PRACTICE', 'LECTURE', 'OTHER'],
  SEMINAR: ['PRACTICE', 'LECTURE', 'OTHER'],
  LAB: ['LAB', 'COMPUTER'],
  CONSULTATION: [],
  SPRS: [],
}

/** Розклад дзвінків: номер пари → час початку/кінця. */
export interface BellTime {
  slot: number
  start: string
  end: string
}

export const BELL_TIMES: readonly BellTime[] = [
  { slot: 1, start: '08:30', end: '09:50' },
  { slot: 2, start: '10:00', end: '11:20' },
  { slot: 3, start: '11:50', end: '13:10' },
  { slot: 4, start: '13:20', end: '14:40' },
]

/** Виховна година (5-й слот, раз на тиждень). */
export const HOMEROOM_BELL: BellTime = { slot: 5, start: '14:50', end: '15:30' }

/**
 * Орієнтовна кількість тижнів теоретичного навчання в семестрі.
 * Використовується як fallback, якщо для версії плану немає записів
 * AcademicCalendarEntry (тижнів типу INSTRUCTION).
 */
export const DEFAULT_TEACHING_WEEKS = 16

/** Назви видів занять (для попереджень/логів). */
export const LESSON_TYPE_LABELS: Record<string, string> = {
  LECTURE: 'Лекція',
  PRACTICE: 'Практичне',
  LAB: 'Лабораторна',
  SEMINAR: 'Семінар',
  CONSULTATION: 'Консультація',
  SPRS: 'СПРС',
}
