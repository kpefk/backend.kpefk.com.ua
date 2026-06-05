import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateGroupAssignmentDto } from './dto/create-group-assignment.dto'

const VERSION_INCLUDE = {
  version: {
    select: {
      id: true,
      versionNumber: true,
      approvalDate: true,
      isPublished: true,
    },
  },
  curriculum: {
    select: {
      id: true,
      educationForm: true,
      admissionBasis: true,
      entryYear: true,
      totalEcts: true,
    },
  },
  group: { select: { id: true, name: true } },
} as const

@Injectable()
export class GroupAssignmentsService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Повертає активне призначення групи до версії навчального плану.
   */
  public async findActiveForGroup(groupId: string) {
    await this.ensureGroupExists(groupId)

    return this.prisma.groupCurriculumAssignment.findFirst({
      where: { groupId, isActive: true },
      include: VERSION_INCLUDE,
    })
  }

  /**
   * Повертає всю историю призначень групи.
   */
  public async findHistoryForGroup(groupId: string) {
    await this.ensureGroupExists(groupId)

    return this.prisma.groupCurriculumAssignment.findMany({
      where: { groupId },
      orderBy: { effectiveFrom: 'desc' },
      include: VERSION_INCLUDE,
    })
  }

  /**
   * Повертає список усіх призначень з фільтрацією.
   */
  public async findAll(groupId?: string, versionId?: string, activeOnly?: boolean) {
    return this.prisma.groupCurriculumAssignment.findMany({
      where: {
        ...(groupId ? { groupId } : {}),
        ...(versionId ? { versionId } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { effectiveFrom: 'desc' },
      include: VERSION_INCLUDE,
    })
  }

  /**
   * Призначає групу до версії навчального плану.
   *
   * Правила:
   * 1. Версія повинна бути опублікована.
   * 2. versionId повинен належати вказаному curriculumId.
   * 3. Якщо є активне призначення — автоматично закривається.
   */
  public async create(dto: CreateGroupAssignmentDto) {
    await this.ensureGroupExists(dto.groupId)

    const version = await this.prisma.curriculumVersion.findUnique({
      where: { id: dto.versionId },
    })
    if (!version) throw new NotFoundException('Версію навчального плану не знайдено.')
    if (!version.isPublished) {
      throw new BadRequestException(
        "Не можна прив'язати групу до неопублікованої версії плану.",
      )
    }
    if (version.curriculumId !== dto.curriculumId) {
      throw new BadRequestException(
        'Версія не належить до вказаного навчального плану.',
      )
    }

    const effectiveFrom = new Date(dto.effectiveFrom)

    return this.prisma.$transaction(async (tx) => {
      // Закриваємо попереднє активне призначення, якщо є
      const existing = await tx.groupCurriculumAssignment.findFirst({
        where: { groupId: dto.groupId, isActive: true },
      })
      if (existing) {
        await tx.groupCurriculumAssignment.update({
          where: { id: existing.id },
          data: { isActive: false, effectiveUntil: effectiveFrom },
        })
      }

      return tx.groupCurriculumAssignment.create({
        data: {
          groupId: dto.groupId,
          curriculumId: dto.curriculumId,
          versionId: dto.versionId,
          effectiveFrom,
          isActive: true,
          assignedBy: dto.assignedBy ?? null,
          reason: dto.reason ?? null,
        },
        include: VERSION_INCLUDE,
      })
    })
  }

  /**
   * Явно закриває активне призначення (без нового призначення).
   * Використовується при відрахуванні групи або завершенні навчання.
   */
  public async close(assignmentId: string) {
    const assignment = await this.prisma.groupCurriculumAssignment.findUnique({
      where: { id: assignmentId },
    })
    if (!assignment) throw new NotFoundException('Призначення не знайдено.')
    if (!assignment.isActive) {
      throw new BadRequestException('Призначення вже закрите.')
    }

    return this.prisma.groupCurriculumAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false, effectiveUntil: new Date() },
    })
  }

  private async ensureGroupExists(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new NotFoundException('Групу не знайдено.')
    return group
  }
}
