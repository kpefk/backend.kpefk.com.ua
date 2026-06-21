import { Injectable } from '@nestjs/common'

import { EducationForm } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { SLOTS_PER_DAY } from './schedule.constants'
import type {
  ScheduleSettingsDto,
  UpdateScheduleSettingsDto,
} from './dto/schedule.dto'

/**
 * Налаштування модуля розкладу (ТЗ §3.4, §4 — Адміністратор системи).
 * Зберігаються в єдиному рядку (singleton). Ліміти пар/день — параметри.
 */
@Injectable()
export class ScheduleSettingsService {
  public constructor(private readonly prisma: PrismaService) {}

  /** Повертає налаштування, створюючи рядок зі значеннями за замовчуванням за потреби. */
  public async get(): Promise<ScheduleSettingsDto> {
    const existing = await this.prisma.scheduleSettings.findFirst()
    if (existing) return this.toDto(existing)

    const created = await this.prisma.scheduleSettings.create({
      data: { maxPairsFullTime: SLOTS_PER_DAY },
    })
    return this.toDto(created)
  }

  public async update(dto: UpdateScheduleSettingsDto): Promise<ScheduleSettingsDto> {
    const current = await this.prisma.scheduleSettings.findFirst()
    if (!current) {
      const created = await this.prisma.scheduleSettings.create({
        data: {
          maxPairsFullTime: dto.maxPairsFullTime ?? SLOTS_PER_DAY,
          maxPairsPartTime: dto.maxPairsPartTime ?? null,
          homeroomCountsToLimit: dto.homeroomCountsToLimit ?? false,
        },
      })
      return this.toDto(created)
    }

    const updated = await this.prisma.scheduleSettings.update({
      where: { id: current.id },
      data: {
        maxPairsFullTime: dto.maxPairsFullTime,
        maxPairsPartTime:
          dto.maxPairsPartTime === undefined ? undefined : dto.maxPairsPartTime,
        homeroomCountsToLimit: dto.homeroomCountsToLimit,
      },
    })
    return this.toDto(updated)
  }

  /**
   * Ліміт пар на день для заданої форми навчання (ТЗ §3.4).
   * Денна → maxPairsFullTime; інші → maxPairsPartTime (null = без обмеження).
   */
  public async maxPairsForForm(form: EducationForm | null): Promise<number | null> {
    const s = await this.get()
    if (form === EducationForm.FULL_TIME || form === null) return s.maxPairsFullTime
    return s.maxPairsPartTime
  }

  private toDto(row: {
    maxPairsFullTime: number
    maxPairsPartTime: number | null
    homeroomCountsToLimit: boolean
  }): ScheduleSettingsDto {
    return {
      maxPairsFullTime: row.maxPairsFullTime,
      maxPairsPartTime: row.maxPairsPartTime,
      homeroomCountsToLimit: row.homeroomCountsToLimit,
    }
  }
}
