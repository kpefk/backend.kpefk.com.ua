import { BadRequestException, Injectable, Logger } from '@nestjs/common'

import type { Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { parseDiplomaXml, type ParsedDiplomaOrder } from './diploma-xml.parser'
import { ImportCommitDto } from './dto/diploma.dto'

@Injectable()
export class DiplomaImportService {
  private readonly logger = new Logger(DiplomaImportService.name)

  public constructor(private readonly prisma: PrismaService) {}

  /** Парсинг XML без запису — для попереднього перегляду. */
  public preview(file: Express.Multer.File) {
    const orders = this.parse(file)
    // Групуємо за назвою спеціальності (XML ЄДЕБО не містить коду).
    const bySpecialty = new Map<string, { code: string; name: string; count: number }>()
    for (const o of orders) {
      const name = o.specialityName ?? '—'
      const existing = bySpecialty.get(name)
      if (existing) existing.count++
      else bySpecialty.set(name, { code: o.specialtyCode ?? '', name, count: 1 })
    }
    return {
      count: orders.length,
      specialties: [...bySpecialty.values()].sort((a, b) => a.code.localeCompare(b.code)),
      items: orders.map((o) => ({
        lastNameUk: o.lastNameUk,
        firstNameUk: o.firstNameUk,
        documentSeries: o.documentSeries,
        documentNumber: o.documentNumber,
        specialtyCode: o.specialtyCode,
        specialityName: o.specialityName,
        studyGroupName: o.studyGroupName,
      })),
    }
  }

  /** Запис: створює DiplomaBatch + Diploma[], авто-підбір шаблону за кодом спеціальності. */
  public async commit(
    file: Express.Multer.File,
    dto: ImportCommitDto,
    userId: string,
  ) {
    const orders = this.parse(file)

    // Авто-підбір шаблону: XML дає назву спеціальності без коду
    // ("Комп'ютерні науки"), тож матчимо за назвою (або кодом, якщо є).
    // Рівно один активний кандидат → авто-призначення.
    const activeTemplates = await this.prisma.diplomaTemplate.findMany({
      where: { isActive: true },
      select: { id: true, specialtyCode: true, specialtyName: true },
    })
    const norm = (s: string | null): string =>
      (s ?? '').toLowerCase().replace(/['ʼ`’]/g, '').replace(/\s+/g, ' ').trim()
    const resolveTemplate = (order: ParsedDiplomaOrder): string | null => {
      const orderName = norm(order.specialityName)
      const matches = activeTemplates.filter((t) => {
        if (order.specialtyCode && t.specialtyCode &&
          t.specialtyCode.toUpperCase() === order.specialtyCode) {
          return true
        }
        const tn = norm(t.specialtyName)
        return orderName !== '' && tn !== '' &&
          (tn === orderName || tn.includes(orderName) || orderName.includes(tn))
      })
      return matches.length === 1 ? matches[0]!.id : null
    }

    // Період навчання (§7.1) — зі Student.educationDateBegin/End, матч за GUID особи.
    const students = await this.prisma.student.findMany({
      select: {
        personCodeU: true,
        educationId: true,
        personId: true,
        educationDateBegin: true,
        educationDateEnd: true,
      },
    })
    const studentByCode = new Map(students.map((s) => [s.personCodeU, s]))
    const studentByEduId = new Map(students.map((s) => [s.educationId, s]))
    const matchStudent = (o: ParsedDiplomaOrder) =>
      (o.edeboPersonCode ? studentByCode.get(o.edeboPersonCode) : undefined) ??
      (o.personEducationId != null ? studentByEduId.get(o.personEducationId) : undefined) ??
      null

    const batch = await this.prisma.diplomaBatch.create({
      data: {
        name: dto.name,
        academicYear: dto.academicYear ?? null,
        sourceFileName: file.originalname,
        importedById: userId,
        count: orders.length,
      },
      select: { id: true },
    })

    for (const o of orders) {
      const templateId = resolveTemplate(o)
      const student = matchStudent(o)
      const data: Prisma.DiplomaUncheckedCreateInput = {
        ...this.mapOrder(o),
        batchId: batch.id,
        templateId,
        personId: student?.personId ?? null,
        studyDateBegin: student?.educationDateBegin ?? null,
        studyDateEnd: student?.educationDateEnd ?? null,
      }
      if (templateId) {
        data.components = { create: await this.snapshotComponents(templateId) }
      }
      await this.prisma.diploma.create({ data })
    }

    this.logger.log(`Diploma batch ${batch.id}: imported ${orders.length} diplomas`)
    return { batchId: batch.id, count: orders.length }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private parse(file: Express.Multer.File): ParsedDiplomaOrder[] {
    if (!file?.buffer) throw new BadRequestException('Файл не завантажено.')
    const orders = parseDiplomaXml(file.buffer)
    if (orders.length === 0) {
      throw new BadRequestException('У XML не знайдено жодного <Document>.')
    }
    return orders
  }

  private async snapshotComponents(
    templateId: string,
  ): Promise<Prisma.DiplomaComponentCreateWithoutDiplomaInput[]> {
    const components = await this.prisma.diplomaTemplateComponent.findMany({
      where: { templateId },
      orderBy: { orderIndex: 'asc' },
    })
    return components.map((c) => ({
      code: c.code,
      nameUk: c.nameUk,
      nameEn: c.nameEn,
      ects: c.ects,
      type: c.type,
      controlForm: c.controlForm,
      orderIndex: c.orderIndex,
    }))
  }

  private mapOrder(
    o: ParsedDiplomaOrder,
  ): Omit<Prisma.DiplomaUncheckedCreateInput, 'batchId' | 'templateId' | 'components'> {
    return {
      lastNameUk: o.lastNameUk,
      firstNameUk: o.firstNameUk,
      lastNameEn: o.lastNameEn,
      firstNameEn: o.firstNameEn,
      birthday: o.birthday,
      edeboPersonCode: o.edeboPersonCode,
      personEducationId: o.personEducationId,
      inn: o.inn,
      sexName: o.sexName,
      documentSeries: o.documentSeries,
      documentNumber: o.documentNumber,
      supplementId: o.supplementId,
      graduateDate: o.graduateDate,
      issueDate: o.issueDate,
      specialityName: o.specialityName,
      specialityNameEn: o.specialityNameEn,
      qualificationName: o.qualificationName,
      studyProgramName: o.studyProgramName,
      studyProgramNameEn: o.studyProgramNameEn,
      studyGroupName: o.studyGroupName,
      courseName: o.courseName,
      accreditationName: o.accreditationName,
      accreditationNameEn: o.accreditationNameEn,
      bossFio: o.bossFio,
      bossPost: o.bossPost,
      bossFioEn: o.bossFioEn,
      bossPostEn: o.bossPostEn,
      universityPrintName: o.universityPrintName,
      universityPrintNameEn: o.universityPrintNameEn,
      paymentTypeName: o.paymentTypeName,
      educationFormName: o.educationFormName,
    }
  }
}
