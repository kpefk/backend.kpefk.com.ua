import { Injectable, NotFoundException } from '@nestjs/common'
import { Teacher } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

/**
 * Сервіс для роботи зі списком викладачів.
 * Дані синхронізуються з ЄДЕБО через EdboSyncService.
 */
@Injectable()
export class StaffService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Повертає повний список викладачів, відсортований за прізвищем і ім'ям.
   * Включає поле userId — наявність облікового запису в системі.
   */
  public async findAll(): Promise<Teacher[]> {
    return this.prisma.teacher.findMany({
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })
  }

  /**
   * Повертає одного викладача за UUID.
   * @throws NotFoundException якщо не знайдено.
   */
  public async findById(id: string): Promise<Teacher> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    })

    if (!teacher) {
      throw new NotFoundException('Викладача не знайдено.')
    }

    return teacher
  }
}
