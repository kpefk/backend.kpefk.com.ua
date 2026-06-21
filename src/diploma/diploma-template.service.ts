import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import {
  CreateTemplateDto,
  SetTemplateComponentsDto,
  UpdateTemplateDto,
} from './dto/diploma.dto'
import { findMissingPlaceholders } from './diploma.placeholders'

export type TemplateFileKind = 'diploma' | 'addendum'

@Injectable()
export class DiplomaTemplateService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list() {
    const templates = await this.prisma.diplomaTemplate.findMany({
      orderBy: [{ specialtyCode: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        specialtyCode: true,
        specialtyName: true,
        variant: true,
        isActive: true,
        notes: true,
        diplomaDocx: true,
        addendumDocx: true,
        updatedAt: true,
        _count: { select: { components: true } },
      },
    })
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      specialtyCode: t.specialtyCode,
      specialtyName: t.specialtyName,
      variant: t.variant,
      isActive: t.isActive,
      notes: t.notes,
      hasDiplomaDocx: t.diplomaDocx !== null,
      hasAddendumDocx: t.addendumDocx !== null,
      componentCount: t._count.components,
      updatedAt: t.updatedAt.toISOString(),
    }))
  }

  public async get(id: string) {
    const t = await this.prisma.diplomaTemplate.findUnique({
      where: { id },
      include: { components: { orderBy: { orderIndex: 'asc' } } },
    })
    if (!t) throw new NotFoundException('Шаблон не знайдено.')
    return {
      id: t.id,
      name: t.name,
      specialtyCode: t.specialtyCode,
      specialtyName: t.specialtyName,
      variant: t.variant,
      isActive: t.isActive,
      notes: t.notes,
      hasDiplomaDocx: t.diplomaDocx !== null,
      hasAddendumDocx: t.addendumDocx !== null,
      accrCertNumber: t.accrCertNumber,
      accrCertSeries: t.accrCertSeries,
      accrCertEndDate: t.accrCertEndDate,
      accrInstitutionName: t.accrInstitutionName,
      accrInstitutionNameEn: t.accrInstitutionNameEn,
      components: t.components.map((c) => ({
        id: c.id,
        code: c.code,
        nameUk: c.nameUk,
        nameEn: c.nameEn,
        ects: c.ects === null ? null : Number(c.ects),
        type: c.type,
        controlForm: c.controlForm,
        orderIndex: c.orderIndex,
      })),
      updatedAt: t.updatedAt.toISOString(),
    }
  }

  public async create(dto: CreateTemplateDto) {
    const t = await this.prisma.diplomaTemplate.create({
      data: {
        name: dto.name,
        specialtyCode: dto.specialtyCode ?? null,
        specialtyName: dto.specialtyName ?? null,
        variant: dto.variant,
      },
      select: { id: true },
    })
    return this.get(t.id)
  }

  public async update(id: string, dto: UpdateTemplateDto) {
    await this.ensure(id)
    await this.prisma.diplomaTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        specialtyCode: dto.specialtyCode,
        specialtyName: dto.specialtyName,
        variant: dto.variant,
        notes: dto.notes,
        isActive: dto.isActive,
        accrCertNumber: dto.accrCertNumber,
        accrCertSeries: dto.accrCertSeries,
        accrCertEndDate: dto.accrCertEndDate,
        accrInstitutionName: dto.accrInstitutionName,
        accrInstitutionNameEn: dto.accrInstitutionNameEn,
      },
    })
    return this.get(id)
  }

  public async remove(id: string): Promise<void> {
    await this.ensure(id)
    await this.prisma.diplomaTemplate.delete({ where: { id } })
  }

  public async setComponents(id: string, dto: SetTemplateComponentsDto) {
    await this.ensure(id)
    await this.prisma.$transaction([
      this.prisma.diplomaTemplateComponent.deleteMany({ where: { templateId: id } }),
      this.prisma.diplomaTemplateComponent.createMany({
        data: dto.components.map((c, i) => ({
          templateId: id,
          code: c.code ?? null,
          nameUk: c.nameUk,
          nameEn: c.nameEn ?? null,
          ects: c.ects ?? null,
          type: c.type,
          controlForm: c.controlForm ?? null,
          orderIndex: c.orderIndex ?? i,
        })),
      }),
    ])
    return this.get(id)
  }

  public async uploadFile(
    id: string,
    kind: TemplateFileKind,
    buffer: Buffer,
  ): Promise<void> {
    await this.ensure(id)

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Файл порожній.')
    }

    let missing: string[]
    try {
      missing = findMissingPlaceholders(buffer, kind)
    } catch {
      throw new BadRequestException('Не вдалося прочитати .docx — перевірте, що це коректний файл Word.')
    }
    if (missing.length > 0) {
      const label = kind === 'diploma' ? 'диплома' : 'додатка'
      throw new BadRequestException(
        `У шаблоні ${label} відсутні обов'язкові плейсхолдери: ${missing.join(', ')}`,
      )
    }

    const bytes = new Uint8Array(buffer)
    await this.prisma.diplomaTemplate.update({
      where: { id },
      data: kind === 'diploma' ? { diplomaDocx: bytes } : { addendumDocx: bytes },
    })
  }

  private async ensure(id: string): Promise<void> {
    const exists = await this.prisma.diplomaTemplate.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new NotFoundException('Шаблон не знайдено.')
  }
}
