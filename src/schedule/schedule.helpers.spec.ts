import { ClassroomType } from '@prisma/client'

import { mapEntry, type EntryRow } from './schedule.helpers'

/**
 * Юніт-тести колізій `mapEntry` під критерії приймання ТЗ §8:
 *  - §3.7 місткість аудиторії vs розмір групи;
 *  - §3.7 тип аудиторії vs вид заняття;
 *  - §3.4 ліміт пар на день (5-та пара денної форми → конфлікт).
 */

type Overrides = Partial<{
  id: string
  scheduleId: string
  dayOfWeek: number
  slotNumber: number
  lessonType: EntryRow['lessonType']
  subgroupNumber: number | null
  classroom: EntryRow['classroom']
  teacherId: string | null
  classroomId: string | null
}>

function entry(o: Overrides = {}): EntryRow & { scheduleId: string } {
  return {
    id: o.id ?? 'e1',
    scheduleId: o.scheduleId ?? 's1',
    dayOfWeek: o.dayOfWeek ?? 1,
    slotNumber: o.slotNumber ?? 1,
    weekParity: 'EVERY',
    lessonType: o.lessonType ?? 'LECTURE',
    subgroupNumber: o.subgroupNumber ?? null,
    curriculumComponentTermId: 'ct1',
    teacherId: o.teacherId ?? null,
    classroomId: o.classroomId ?? null,
    onlineUrl: null,
    teacher: null,
    classroom: o.classroom ?? null,
    curriculumComponentTerm: { component: { code: 'ОК1', name: 'Математика' } },
    substitutions: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  } as unknown as EntryRow & { scheduleId: string }
}

function classroom(
  capacity: number | null,
  type: ClassroomType | null,
): EntryRow['classroom'] {
  return { id: 'c1', number: '101', name: 'Ауд', capacity, type } as EntryRow['classroom']
}

describe('mapEntry — колізії (ТЗ §3.7, §3.4)', () => {
  describe('§3.7 місткість аудиторії', () => {
    it('конфлікт, коли місткість < розмір групи (вся група)', () => {
      const e = entry({ classroom: classroom(20, null), classroomId: 'c1' })
      const dto = mapEntry(e, 's1', [e], { groupSize: 30 })
      expect(dto.conflicts.some((c) => c.includes('Місткість'))).toBe(true)
    })

    it('без конфлікту, коли місткість ≥ розмір групи', () => {
      const e = entry({ classroom: classroom(30, null), classroomId: 'c1' })
      const dto = mapEntry(e, 's1', [e], { groupSize: 30 })
      expect(dto.conflicts.some((c) => c.includes('Місткість'))).toBe(false)
    })

    it('не перевіряє місткість для підгрупового заняття', () => {
      const e = entry({
        classroom: classroom(20, null),
        classroomId: 'c1',
        subgroupNumber: 1,
      })
      const dto = mapEntry(e, 's1', [e], { groupSize: 30 })
      expect(dto.conflicts.some((c) => c.includes('Місткість'))).toBe(false)
    })
  })

  describe('§3.7 тип аудиторії vs вид заняття', () => {
    it('конфлікт: лабораторна у лекційній аудиторії', () => {
      const e = entry({
        lessonType: 'LAB',
        classroom: classroom(null, ClassroomType.LECTURE),
        classroomId: 'c1',
      })
      const dto = mapEntry(e, 's1', [e], {})
      expect(dto.conflicts.some((c) => c.includes('Тип аудиторії'))).toBe(true)
    })

    it('без конфлікту: лабораторна у лабораторній аудиторії', () => {
      const e = entry({
        lessonType: 'LAB',
        classroom: classroom(null, ClassroomType.LAB),
        classroomId: 'c1',
      })
      const dto = mapEntry(e, 's1', [e], {})
      expect(dto.conflicts.some((c) => c.includes('Тип аудиторії'))).toBe(false)
    })

    it('без обмежень типу для консультації (allowed=[])', () => {
      const e = entry({
        lessonType: 'CONSULTATION',
        classroom: classroom(null, ClassroomType.LAB),
        classroomId: 'c1',
      })
      const dto = mapEntry(e, 's1', [e], {})
      expect(dto.conflicts.some((c) => c.includes('Тип аудиторії'))).toBe(false)
    })
  })

  describe('§3.4 ліміт пар на день (денна форма)', () => {
    // Група має 5 пар у понеділок (слоти 1..5), ліміт денної форми = 4.
    const day = [1, 2, 3, 4, 5].map((slot) =>
      entry({ id: `e${slot}`, slotNumber: slot, dayOfWeek: 1 }),
    )

    it('5-та пара денної форми → конфлікт перевищення ліміту', () => {
      const fifth = day[4]
      const dto = mapEntry(fifth, 's1', day, { maxPairsPerDay: 4 })
      expect(dto.conflicts.some((c) => c.includes('ліміт пар на день'))).toBe(true)
    })

    it('перші 4 пари — без конфлікту ліміту', () => {
      for (const e of day.slice(0, 4)) {
        const dto = mapEntry(e, 's1', day, { maxPairsPerDay: 4 })
        expect(dto.conflicts.some((c) => c.includes('ліміт пар на день'))).toBe(false)
      }
    })

    it('без ліміту (maxPairsPerDay undefined) — конфлікту немає навіть на 5-й парі', () => {
      const dto = mapEntry(day[4], 's1', day, {})
      expect(dto.conflicts.some((c) => c.includes('ліміт пар на день'))).toBe(false)
    })
  })
})
