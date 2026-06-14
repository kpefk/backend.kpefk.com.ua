import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateQualificationUpgradeDto } from './dto/create-qualification-upgrade.dto'

/**
 * Управляє записами підвищення кваліфікації педагогічних працівників.
 * Ст. 24 Закону №2745-VIII: підвищення кваліфікації — не рідше 1 разу на 5 років,
 * загальний обсяг — не менше 120 годин за 5 років.
 */
@Injectable()
export class QualificationUpgradesService {
  private readonly logger = new Logger(QualificationUpgradesService.name)

  /** Мінімальний сумарний обсяг за 5 років (ст. 24 Закону №2745-VIII). */
  private static readonly MIN_HOURS_PER_5_YEARS = 120

  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(teacherId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } })
    if (!teacher) throw new NotFoundException('Викладача не знайдено.')

    return this.prisma.teacherQualificationUpgrade.findMany({
      where: { teacherId },
      orderBy: { startDate: 'desc' },
    })
  }

  public async create(teacherId: string, dto: CreateQualificationUpgradeDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } })
    if (!teacher) throw new NotFoundException('Викладача не знайдено.')

    const start = new Date(dto.startDate)
    const end = new Date(dto.endDate)
    if (end <= start) {
      throw new BadRequestException('Дата закінчення повинна бути пізніше дати початку.')
    }

    const record = await this.prisma.teacherQualificationUpgrade.create({
      data: {
        teacherId,
        courseName: dto.courseName,
        organizationName: dto.organizationName,
        startDate: start,
        endDate: end,
        hours: dto.hours,
        certificateNumber: dto.certificateNumber,
      },
    })

    // SOFT WARN: перевірити, чи вистачає годин за останні 5 років
    await this.checkFiveYearQuota(teacherId, end)

    return record
  }

  public async remove(teacherId: string, upgradeId: string) {
    const record = await this.prisma.teacherQualificationUpgrade.findUnique({
      where: { id: upgradeId },
    })
    if (!record || record.teacherId !== teacherId) {
      throw new NotFoundException('Запис підвищення кваліфікації не знайдено.')
    }

    return this.prisma.teacherQualificationUpgrade.delete({ where: { id: upgradeId } })
  }

  /**
   * SOFT WARN: сумарний обсяг годин за 5 років до `referenceDate`.
   * Якщо < 120 — логує попередження (ст. 24 Закону №2745-VIII).
   */
  private async checkFiveYearQuota(teacherId: string, referenceDate: Date) {
    const fiveYearsAgo = new Date(referenceDate)
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    const agg = await this.prisma.teacherQualificationUpgrade.aggregate({
      where: {
        teacherId,
        endDate: { gte: fiveYearsAgo, lte: referenceDate },
      },
      _sum: { hours: true },
    })

    const total = agg._sum.hours ?? 0
    if (total < QualificationUpgradesService.MIN_HOURS_PER_5_YEARS) {
      this.logger.warn(
        `[SOFT WARN] Викладач teacherId=${teacherId} має лише ${total} год підвищення кваліфікації ` +
          `за останні 5 років. Мінімум — ${QualificationUpgradesService.MIN_HOURS_PER_5_YEARS} год ` +
          `(ст. 24 Закону №2745-VIII).`,
      )
    }
  }
}
