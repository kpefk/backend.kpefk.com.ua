import { BadRequestException, Injectable } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import type {
  GradeWeightSettingsDto,
  UpdateGradeWeightSettingsDto,
} from './dto/grade-weight-settings.dto'

/**
 * Глобальна вагова схема для формули підсумкової оцінки (підказка, не жорстке правило).
 * Зберігається в єдиному рядку (singleton), як і ScheduleSettings.
 */
@Injectable()
export class GradeWeightSettingsService {
  public constructor(private readonly prisma: PrismaService) {}

  /** Повертає налаштування, створюючи рядок зі значеннями за замовчуванням (60/40) за потреби. */
  public async get(): Promise<GradeWeightSettingsDto> {
    const existing = await this.prisma.gradeWeightSettings.findFirst()
    if (existing) return this.toDto(existing)

    const created = await this.prisma.gradeWeightSettings.create({ data: {} })
    return this.toDto(created)
  }

  public async update(dto: UpdateGradeWeightSettingsDto): Promise<GradeWeightSettingsDto> {
    if (dto.currentWeight + dto.examWeight !== 100) {
      throw new BadRequestException('Сума ваг повинна дорівнювати 100%')
    }

    const current = await this.prisma.gradeWeightSettings.findFirst()
    if (!current) {
      const created = await this.prisma.gradeWeightSettings.create({
        data: { currentWeight: dto.currentWeight, examWeight: dto.examWeight },
      })
      return this.toDto(created)
    }

    const updated = await this.prisma.gradeWeightSettings.update({
      where: { id: current.id },
      data: { currentWeight: dto.currentWeight, examWeight: dto.examWeight },
    })
    return this.toDto(updated)
  }

  private toDto(row: { currentWeight: number; examWeight: number }): GradeWeightSettingsDto {
    return { currentWeight: row.currentWeight, examWeight: row.examWeight }
  }
}
