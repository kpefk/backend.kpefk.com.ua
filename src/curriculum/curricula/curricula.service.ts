import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateCurriculumDto } from './dto/create-curriculum.dto'
import { UpdateCurriculumDto } from './dto/update-curriculum.dto'

@Injectable()
export class CurriculaService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(programId?: string, entryYear?: number) {
    return this.prisma.curriculum.findMany({
      where: {
        ...(programId ? { programId } : {}),
        ...(entryYear ? { entryYear } : {}),
      },
      orderBy: [{ entryYear: 'desc' }, { educationForm: 'asc' }],
      include: {
        program: {
          select: {
            id: true,
            name: true,
            qualificationName: true,
            specialty: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { versions: true, groupAssignments: true } },
      },
    })
  }

  public async findById(id: string) {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id },
      include: {
        program: {
          include: {
            specialty: { select: { id: true, code: true, name: true } },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            approvalDate: true,
            approvalOrderNumber: true,
            approvedBy: true,
            isPublished: true,
            publishedAt: true,
            deprecatedAt: true,
            createdAt: true,
          },
        },
        _count: { select: { versions: true, groupAssignments: true } },
      },
    })

    if (!curriculum) throw new NotFoundException('Навчальний план не знайдено.')
    return curriculum
  }

  public async create(dto: CreateCurriculumDto) {
    const program = await this.prisma.educationalProgram.findUnique({ where: { id: dto.programId } })
    if (!program) throw new NotFoundException('Освітню програму не знайдено.')

    const existing = await this.prisma.curriculum.findFirst({
      where: {
        programId: dto.programId,
        educationForm: dto.educationForm,
        admissionBasis: dto.admissionBasis,
        entryYear: dto.entryYear,
      },
    })
    if (existing) {
      throw new BadRequestException(
        'Навчальний план з такою комбінацією (ОПП, форма, підстава, рік) вже існує.',
      )
    }

    return this.prisma.curriculum.create({
      data: {
        programId: dto.programId,
        educationForm: dto.educationForm,
        admissionBasis: dto.admissionBasis,
        entryYear: dto.entryYear,
        studyDurationMonths: dto.studyDurationMonths,
        totalEcts: dto.totalEcts,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
      include: {
        program: {
          include: { specialty: { select: { id: true, code: true, name: true } } },
        },
      },
    })
  }

  public async update(id: string, dto: UpdateCurriculumDto) {
    await this.ensureExists(id)
    return this.prisma.curriculum.update({
      where: { id },
      data: {
        ...(dto.studyDurationMonths !== undefined && { studyDurationMonths: dto.studyDurationMonths }),
        ...(dto.totalEcts !== undefined && { totalEcts: dto.totalEcts }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  /**
   * Видаляє навчальний план.
   * Дозволено лише якщо план не має жодної версії (в будь-якому статусі).
   * Наявність хоча б однієї версії блокує видалення — робочий і груповий
   * контекст прив'язується до версій, не до самого плану.
   */
  public async deleteCurriculum(id: string): Promise<void> {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id },
      include: {
        _count: { select: { versions: true, groupAssignments: true } },
      },
    })
    if (!curriculum) throw new NotFoundException('Навчальний план не знайдено.')

    if (curriculum._count.versions > 0) {
      throw new BadRequestException(
        'Навчальний план не можна видалити, поки для нього існують версії. ' +
        'Видаліть усі чернеткові версії та переконайтесь у відсутності опублікованих перед видаленням плану.',
      )
    }

    if (curriculum._count.groupAssignments > 0) {
      throw new BadRequestException(
        'Навчальний план не можна видалити — до нього прив\'язані групи.',
      )
    }

    await this.prisma.curriculum.delete({ where: { id } })
  }

  public async getVersions(id: string) {
    await this.ensureExists(id)
    return this.prisma.curriculumVersion.findMany({
      where: { curriculumId: id },
      orderBy: { versionNumber: 'desc' },
    })
  }

  private async ensureExists(id: string) {
    const curriculum = await this.prisma.curriculum.findUnique({ where: { id } })
    if (!curriculum) throw new NotFoundException('Навчальний план не знайдено.')
    return curriculum
  }
}
