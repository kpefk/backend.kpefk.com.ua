import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

/** Ключі стану синхронізації в таблиці sync_state */
export const SYNC_KEYS = {
  STUDENTS: 'students_last_sync_at',
  STAFF: 'staff_last_sync_at',
} as const

/**
 * Сервіс для зберігання стану інкрементальної синхронізації.
 *
 * Таблиця `sync_state` зберігає дату останнього успішного запуску
 * кожного типу синхронізації у вигляді пари ключ/значення.
 * Дата оновлюється лише після повністю успішного завершення sync,
 * що гарантує повторну обробку при помилках.
 */
@Injectable()
export class SyncStateService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Повертає збережену дату для заданого ключа або null, якщо запису немає.
   */
  public async getDate(key: string): Promise<Date | null> {
    const record = await this.prisma.syncState.findUnique({ where: { key } })
    return record ? new Date(record.value) : null
  }

  /**
   * Зберігає або оновлює дату для заданого ключа.
   * Використовується лише після успішного завершення sync.
   */
  public async setDate(key: string, value: Date): Promise<void> {
    await this.prisma.syncState.upsert({
      where: { key },
      create: { key, value: value.toISOString() },
      update: { value: value.toISOString() },
    })
  }
}
