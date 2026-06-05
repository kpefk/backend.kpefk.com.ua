import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateSpecialtyDto } from './dto/create-specialty.dto'
import { UpdateSpecialtyDto } from './dto/update-specialty.dto'

@Injectable()
export class SpecialtiesService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll() {
    return this.prisma.specialty.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { programs: true } } },
    })
  }

  public async findById(id: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
      include: {
        programs: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, qualificationName: true, edeboId: true, isActive: true },
        },
        _count: { select: { programs: true } },
      },
    })

    if (!specialty) throw new NotFoundException('Спеціальність не знайдено.')
    return specialty
  }

  public async create(dto: CreateSpecialtyDto) {
    const existing = await this.prisma.specialty.findUnique({ where: { code: dto.code } })
    if (existing) throw new BadRequestException(`Спеціальність з кодом "${dto.code}" вже існує.`)

    return this.prisma.specialty.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        shortName: dto.shortName?.trim() ?? null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  public async update(id: string, dto: UpdateSpecialtyDto) {
    await this.ensureExists(id)

    if (dto.code !== undefined) {
      const conflict = await this.prisma.specialty.findFirst({
        where: { code: dto.code, NOT: { id } },
      })
      if (conflict) throw new BadRequestException(`Код "${dto.code}" вже використовується.`)
    }

    return this.prisma.specialty.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.shortName !== undefined && { shortName: dto.shortName?.trim() ?? null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })
  }

  public async deactivate(id: string) {
    await this.ensureExists(id)
    return this.prisma.specialty.update({
      where: { id },
      data: { isActive: false },
    })
  }

  private async ensureExists(id: string) {
    const specialty = await this.prisma.specialty.findUnique({ where: { id } })
    if (!specialty) throw new NotFoundException('Спеціальність не знайдено.')
    return specialty
  }
}
