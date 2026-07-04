/**
 * Unit tests for teacher-load.formulas — норми часу Наказу МОН №686, п.10/11/12/13/14/16/17/18/20.
 *
 * Pure functions, no Prisma/DB required.
 * Run: npx jest teacher-load.formulas.spec.ts
 */
import {
  computeControlWorksCheckHours,
  computeCourseWorkSupervisionHours,
  computeDiplomaSupervisionHoursPerAssignee,
  computePracticeSupervisionHours,
  computePreControlConsultationHours,
  computeSemesterControlHours,
} from './teacher-load.formulas'

describe('computeSemesterControlHours', () => {
  it('CREDIT → 2 год на групу (п.14)', () => {
    expect(computeSemesterControlHours('CREDIT', null, 1, 25)).toBe(2)
    expect(computeSemesterControlHours('CREDIT', null, 3, 75)).toBe(6)
  })

  it('GRADED_CREDIT → та сама норма, що й CREDIT (п.14)', () => {
    expect(computeSemesterControlHours('GRADED_CREDIT', null, 2, 50)).toBe(4)
  })

  it('EXAM + ORAL → 0.33 год на студента (п.16, усно)', () => {
    expect(computeSemesterControlHours('EXAM', 'ORAL', 1, 25)).toBeCloseTo(8.25)
  })

  it('EXAM + WRITTEN → 3 год на групу + 0.5 год на студента (п.16, письмово)', () => {
    // 1 група, 25 студентів: 3×1 + 0.5×25 = 15.5
    expect(computeSemesterControlHours('EXAM', 'WRITTEN', 1, 25)).toBeCloseTo(15.5)
    // 2 групи (потоковий облік іде по кожній групі окремо, тут перевіряємо агреговано)
    expect(computeSemesterControlHours('EXAM', 'WRITTEN', 2, 50)).toBeCloseTo(31)
  })

  it('EXAM без обраного формату → 0 (не налаштовано)', () => {
    expect(computeSemesterControlHours('EXAM', null, 1, 25)).toBe(0)
  })

  it('controlForm = null → 0 (немає підсумкового контролю)', () => {
    expect(computeSemesterControlHours(null, null, 1, 25)).toBe(0)
  })
})

describe('computeControlWorksCheckHours', () => {
  it('0 робіт → 0 годин', () => {
    expect(computeControlWorksCheckHours(0, 0, 25)).toBe(0)
  })

  it('1 аудиторна робота → 0.25 год на студента (п.11)', () => {
    expect(computeControlWorksCheckHours(1, 0, 25)).toBeCloseTo(6.25)
  })

  it('1 самостійна робота → 0.33 год на студента (п.12)', () => {
    expect(computeControlWorksCheckHours(0, 1, 25)).toBeCloseTo(8.25)
  })

  it('2 аудиторні + 1 самостійна → сума обох норм', () => {
    // 2×25×0.25 + 1×25×0.33 = 12.5 + 8.25 = 20.75
    expect(computeControlWorksCheckHours(2, 1, 25)).toBeCloseTo(20.75)
  })

  it('0 студентів у групі → 0 годин незалежно від кількості робіт', () => {
    expect(computeControlWorksCheckHours(3, 2, 0)).toBe(0)
  })
})

describe('computePracticeSupervisionHours', () => {
  it('EDUCATIONAL → 18 год/тиждень на групу (п.17), не залежить від studentCount', () => {
    expect(computePracticeSupervisionHours('PRACTICE', 'EDUCATIONAL', 2, 25)).toBe(36)
    expect(computePracticeSupervisionHours('PRACTICE', 'EDUCATIONAL', 2, 100)).toBe(36)
  })

  it('TECHNOLOGICAL → 1 год/студента/тиждень (п.18)', () => {
    expect(computePracticeSupervisionHours('PRACTICE', 'TECHNOLOGICAL', 3, 25)).toBe(75)
  })

  it('PRE_GRADUATION → та сама норма, що й TECHNOLOGICAL (п.18)', () => {
    expect(computePracticeSupervisionHours('PRACTICE', 'PRE_GRADUATION', 4, 20)).toBe(80)
  })

  it('componentType ≠ PRACTICE → 0 незалежно від інших параметрів', () => {
    expect(computePracticeSupervisionHours('DISCIPLINE', 'EDUCATIONAL', 2, 25)).toBe(0)
  })

  it('practiceType = null → 0 (не налаштовано)', () => {
    expect(computePracticeSupervisionHours('PRACTICE', null, 2, 25)).toBe(0)
  })

  it('durationWeeks = null або 0 → 0', () => {
    expect(computePracticeSupervisionHours('PRACTICE', 'EDUCATIONAL', null, 25)).toBe(0)
    expect(computePracticeSupervisionHours('PRACTICE', 'EDUCATIONAL', 0, 25)).toBe(0)
  })
})

describe('computeCourseWorkSupervisionHours', () => {
  it('курсова робота → 3 год/студента незалежно від типу дисципліни (п.13)', () => {
    expect(computeCourseWorkSupervisionHours(true, false, 'PROFESSIONAL_COMPETENCY', 25)).toBe(75)
    expect(computeCourseWorkSupervisionHours(true, false, 'GENERAL_COMPETENCY', 25)).toBe(75)
  })

  it('курсовий проєкт, загальнотехнічна дисципліна → 3 год/студента (п.13)', () => {
    expect(computeCourseWorkSupervisionHours(false, true, 'GENERAL_COMPETENCY', 20)).toBe(60)
  })

  it('курсовий проєкт, фахова дисципліна → 4 год/студента (п.13)', () => {
    expect(computeCourseWorkSupervisionHours(false, true, 'PROFESSIONAL_COMPETENCY', 20)).toBe(80)
  })

  it('ні курсової, ні проєкту → 0', () => {
    expect(computeCourseWorkSupervisionHours(false, false, 'PROFESSIONAL_COMPETENCY', 25)).toBe(0)
  })

  it('одночасно курсова + проєкт (нетиповий випадок) → норми додаються', () => {
    // 3×25 (робота) + 4×25 (проєкт, фахова) = 75 + 100 = 175
    expect(computeCourseWorkSupervisionHours(true, true, 'PROFESSIONAL_COMPETENCY', 25)).toBe(175)
  })

  it('0 студентів → 0 годин', () => {
    expect(computeCourseWorkSupervisionHours(true, true, 'PROFESSIONAL_COMPETENCY', 0)).toBe(0)
  })
})

describe('computeDiplomaSupervisionHoursPerAssignee', () => {
  it('1 керівник → 16 год (п.20)', () => {
    expect(computeDiplomaSupervisionHoursPerAssignee(1)).toBe(16)
  })

  it('1 керівник + 1 консультант → по 8 год кожному', () => {
    expect(computeDiplomaSupervisionHoursPerAssignee(2)).toBe(8)
  })

  it('1 керівник + 3 консультанти → по 4 год кожному', () => {
    expect(computeDiplomaSupervisionHoursPerAssignee(4)).toBe(4)
  })

  it('0 призначених → 0 годин', () => {
    expect(computeDiplomaSupervisionHoursPerAssignee(0)).toBe(0)
  })
})

describe('computePreControlConsultationHours', () => {
  it('CREDIT → 2 год на групу (п.10)', () => {
    expect(computePreControlConsultationHours('CREDIT', 1)).toBe(2)
    expect(computePreControlConsultationHours('CREDIT', 3)).toBe(6)
  })

  it('GRADED_CREDIT → та сама норма (п.10)', () => {
    expect(computePreControlConsultationHours('GRADED_CREDIT', 2)).toBe(4)
  })

  it('EXAM → та сама норма незалежно від формату екзамену (п.10)', () => {
    expect(computePreControlConsultationHours('EXAM', 1)).toBe(2)
  })

  it('controlForm = null → 0 (немає підсумкового контролю)', () => {
    expect(computePreControlConsultationHours(null, 1)).toBe(0)
  })
})
