import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { SubstitutionType } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import type { CreateSubstitutionDto } from './dto/schedule.dto'
import { ScheduleService } from './schedule.service'

/**
 * Оперативні заміни/перенесення/скасування занять на конкретну дату
 * без зміни базового тижневого шаблону (ТЗ §3.8, §7.3).
 */
@Injectable()
export class ScheduleSubstitutionService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /** Створює (або оновлює — upsert по entryId+date) заміну й повертає розклад. */
  public async upsert(dto: CreateSubstitutionDto, userId?: string) {
    const entry = await this.prisma.scheduleEntry.findUnique({
      where: { id: dto.entryId },
      select: { id: true, scheduleId: true },
    })
    if (!entry) throw new NotFoundException('Заняття не знайдено.')

    if (dto.type === SubstitutionType.MOVED && dto.newDayOfWeek == null) {
      throw new BadRequestException('Для перенесення вкажіть новий день (newDayOfWeek).')
    }
    if (
      dto.type === SubstitutionType.TEACHER_CHANGE &&
      dto.replacementTeacherId == null
    ) {
      throw new BadRequestException('Для заміни викладача вкажіть replacementTeacherId.')
    }
    if (
      dto.type === SubstitutionType.ROOM_CHANGE &&
      dto.replacementClassroomId == null
    ) {
      throw new BadRequestException('Для заміни аудиторії вкажіть replacementClassroomId.')
    }

    const date = new Date(dto.date)
    const data = {
      type: dto.type,
      newDayOfWeek: dto.newDayOfWeek ?? null,
      newSlotNumber: dto.newSlotNumber ?? null,
      replacementTeacherId: dto.replacementTeacherId ?? null,
      replacementClassroomId: dto.replacementClassroomId ?? null,
      reason: dto.reason ?? null,
      createdById: userId ?? null,
    }

    await this.prisma.scheduleSubstitution.upsert({
      where: { entryId_date: { entryId: dto.entryId, date } },
      create: { entryId: dto.entryId, date, ...data },
      update: data,
    })

    return this.scheduleService.toScheduleDto(entry.scheduleId)
  }

  public async remove(id: string) {
    const sub = await this.prisma.scheduleSubstitution.findUnique({
      where: { id },
      select: { entry: { select: { scheduleId: true } } },
    })
    if (!sub) throw new NotFoundException('Заміну не знайдено.')

    await this.prisma.scheduleSubstitution.delete({ where: { id } })
    return this.scheduleService.toScheduleDto(sub.entry.scheduleId)
  }
}
