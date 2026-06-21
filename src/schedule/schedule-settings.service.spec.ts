import { EducationForm } from '@prisma/client'

import { ScheduleSettingsService } from './schedule-settings.service'

/**
 * §3.4 — ліміт пар на день читається з ScheduleSettings (а не хардкодиться)
 * і залежить від форми навчання групи.
 */
describe('ScheduleSettingsService.maxPairsForForm (ТЗ §3.4)', () => {
  function makeService(settings: {
    maxPairsFullTime: number
    maxPairsPartTime: number | null
    homeroomCountsToLimit: boolean
  }) {
    const findFirst = jest.fn().mockResolvedValue(settings)
    const prisma = { scheduleSettings: { findFirst, create: jest.fn() } }
    const service = new ScheduleSettingsService(
      prisma as unknown as ConstructorParameters<typeof ScheduleSettingsService>[0],
    )
    return { service, findFirst }
  }

  it('денна форма → maxPairsFullTime зі збережених налаштувань', async () => {
    const { service, findFirst } = makeService({
      maxPairsFullTime: 4,
      maxPairsPartTime: 6,
      homeroomCountsToLimit: false,
    })
    await expect(service.maxPairsForForm(EducationForm.FULL_TIME)).resolves.toBe(4)
    expect(findFirst).toHaveBeenCalled()
  })

  it('значення береться з БД, а не хардкод (інший ліміт → інший результат)', async () => {
    const { service } = makeService({
      maxPairsFullTime: 3,
      maxPairsPartTime: null,
      homeroomCountsToLimit: false,
    })
    await expect(service.maxPairsForForm(EducationForm.FULL_TIME)).resolves.toBe(3)
  })

  it('заочна форма → maxPairsPartTime', async () => {
    const { service } = makeService({
      maxPairsFullTime: 4,
      maxPairsPartTime: 6,
      homeroomCountsToLimit: false,
    })
    await expect(service.maxPairsForForm(EducationForm.PART_TIME)).resolves.toBe(6)
  })

  it('заочна форма без обмеження (null) → null', async () => {
    const { service } = makeService({
      maxPairsFullTime: 4,
      maxPairsPartTime: null,
      homeroomCountsToLimit: false,
    })
    await expect(service.maxPairsForForm(EducationForm.PART_TIME)).resolves.toBeNull()
  })

  it('форма не вказана (null) → застосовується ліміт денної форми', async () => {
    const { service } = makeService({
      maxPairsFullTime: 4,
      maxPairsPartTime: 6,
      homeroomCountsToLimit: false,
    })
    await expect(service.maxPairsForForm(null)).resolves.toBe(4)
  })
})
