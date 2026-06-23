import {
  academicYearOf,
  entryVisibleOnDate,
  isoWeekday,
  parseDateOnly,
  semesterMatchesTerm,
  termOf,
  termStartMonday,
  weekParityOf,
} from './attendance.calendar'

describe('attendance.calendar', () => {
  const d = (s: string) => parseDateOnly(s)

  it('academicYearOf: вересень..грудень → поточний-наступний; січень..серпень → попередній-поточний', () => {
    expect(academicYearOf(d('2025-09-01'))).toBe('2025-2026')
    expect(academicYearOf(d('2025-12-31'))).toBe('2025-2026')
    expect(academicYearOf(d('2026-01-15'))).toBe('2025-2026')
    expect(academicYearOf(d('2026-06-17'))).toBe('2025-2026')
    expect(academicYearOf(d('2026-09-01'))).toBe('2026-2027')
  })

  it('termOf: осінь (вер–січ) = 1, весна (лют–серп) = 2', () => {
    expect(termOf(d('2025-09-10'))).toBe(1)
    expect(termOf(d('2026-01-20'))).toBe(1)
    expect(termOf(d('2026-02-01'))).toBe(2)
    expect(termOf(d('2026-06-17'))).toBe(2)
  })

  it('semesterMatchesTerm: непарний семестр ↔ осінь, парний ↔ весна', () => {
    expect(semesterMatchesTerm(1, 1)).toBe(true)
    expect(semesterMatchesTerm(3, 1)).toBe(true)
    expect(semesterMatchesTerm(2, 1)).toBe(false)
    expect(semesterMatchesTerm(2, 2)).toBe(true)
    expect(semesterMatchesTerm(4, 2)).toBe(true)
    expect(semesterMatchesTerm(1, 2)).toBe(false)
  })

  it('isoWeekday: 1=Пн .. 7=Нд', () => {
    expect(isoWeekday(d('2025-09-01'))).toBe(1) // понеділок
    expect(isoWeekday(d('2025-09-06'))).toBe(6) // субота
    expect(isoWeekday(d('2025-09-07'))).toBe(7) // неділя
  })

  it('termStartMonday: понеділок на/після 1 вересня', () => {
    // 1 вересня 2025 — понеділок
    expect(termStartMonday('2025-2026', 1).toISOString().slice(0, 10)).toBe('2025-09-01')
  })

  it('weekParityOf: тиждень 1 = чисельник (ODD), наступний = знаменник (EVEN)', () => {
    expect(weekParityOf(d('2025-09-01'), '2025-2026', 1)).toBe('ODD')
    expect(weekParityOf(d('2025-09-05'), '2025-2026', 1)).toBe('ODD') // той самий тиждень
    expect(weekParityOf(d('2025-09-08'), '2025-2026', 1)).toBe('EVEN')
    expect(weekParityOf(d('2025-09-15'), '2025-2026', 1)).toBe('ODD')
  })

  it('entryVisibleOnDate: EVERY завжди; ODD/EVEN — за парністю', () => {
    expect(entryVisibleOnDate('EVERY', 'ODD')).toBe(true)
    expect(entryVisibleOnDate('EVERY', 'EVEN')).toBe(true)
    expect(entryVisibleOnDate('ODD', 'ODD')).toBe(true)
    expect(entryVisibleOnDate('ODD', 'EVEN')).toBe(false)
    expect(entryVisibleOnDate('EVEN', 'EVEN')).toBe(true)
  })

  it('parseDateOnly кидає на невалідному форматі', () => {
    expect(() => parseDateOnly('17.06.2026')).toThrow()
  })
})
