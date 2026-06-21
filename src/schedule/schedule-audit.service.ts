import { Injectable, Logger } from '@nestjs/common'

import type { Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

/**
 * Журналювання дій над розкладом (ТЗ §7.6 — хто/коли/що змінив).
 * Переюз спільної моделі AuditLog (targetType = 'Schedule').
 */
@Injectable()
export class ScheduleAuditService {
  private readonly logger = new Logger(ScheduleAuditService.name)

  public constructor(private readonly prisma: PrismaService) {}

  /** Записує подію; помилки журналювання не повинні валити основну дію. */
  public async record(
    userId: string,
    action: string,
    targetId: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          targetId,
          targetType: 'Schedule',
          metadata,
        },
      })
    } catch (e) {
      this.logger.warn(`Не вдалося записати аудит ${action}: ${String(e)}`)
    }
  }

  /** Останні записи аудиту для розкладу (для перегляду журналу змін). */
  public list(scheduleId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { targetType: 'Schedule', targetId: scheduleId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    })
  }
}
