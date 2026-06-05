import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import { UpdateEducationalProgramDto } from './dto/update-educational-program.dto'

@Injectable()
export class EducationalProgramsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(specialtyId?: string) {
    return this.prisma.educationalProgram.findMany({
      where: specialtyId ? { specialtyId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        specialty: { select: { id: true, code: true, name: true } },
        _count: { select: { curricula: true } },
      },
    })
  }

  public async findById(id: string) {
    const program = await this.prisma.educationalProgram.findUnique({
      where: { id },
      include: {
        specialty: { select: { id: true, code: true, name: true } },
        curricula: {
          where: { isActive: true },
          orderBy: { entryYear: 'desc' },
          select: {
            id: true,
            educationForm: true,
            admissionBasis: true,
            entryYear: true,
            studyDurationMonths: true,
            totalEcts: true,
            isActive: true,
          },
        },
        _count: { select: { curricula: true } },
      },
    })

    if (!program) throw new NotFoundException('Освітню програму не знайдено.')
    return program
  }

  public async update(id: string, dto: UpdateEducationalProgramDto) {
    await this.ensureExists(id)

    if (dto.specialtyId) {
      const specialty = await this.prisma.specialty.findUnique({ where: { id: dto.specialtyId } })
      if (!specialty) throw new NotFoundException('Спеціальність не знайдено.')
    }

    if (dto.edeboId !== undefined && dto.edeboId !== null) {
      const conflict = await this.prisma.educationalProgram.findFirst({
        where: { edeboId: dto.edeboId, NOT: { id } },
      })
      if (conflict) {
        throw new BadRequestException(`ЄДЕБО ID ${dto.edeboId} вже використовується.`)
      }
    }

    return this.prisma.educationalProgram.update({
      where: { id },
      data: {
        ...(dto.specialtyId !== undefined && { specialtyId: dto.specialtyId }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.qualificationName !== undefined && { qualificationName: dto.qualificationName.trim() }),
        ...(dto.qualificationLevel !== undefined && { qualificationLevel: dto.qualificationLevel?.trim() ?? null }),
        ...(dto.edeboId !== undefined && { edeboId: dto.edeboId ?? null }),
        ...(dto.approvalDate !== undefined && { approvalDate: dto.approvalDate ? new Date(dto.approvalDate) : null }),
        ...(dto.approvalOrderNumber !== undefined && { approvalOrderNumber: dto.approvalOrderNumber?.trim() ?? null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { specialty: { select: { id: true, code: true, name: true } } },
    })
  }

  public async deactivate(id: string) {
    await this.ensureExists(id)
    return this.prisma.educationalProgram.update({ where: { id }, data: { isActive: false } })
  }

  private async ensureExists(id: string) {
    const program = await this.prisma.educationalProgram.findUnique({ where: { id } })
    if (!program) throw new NotFoundException('Освітню програму не знайдено.')
    return program
  }
}
