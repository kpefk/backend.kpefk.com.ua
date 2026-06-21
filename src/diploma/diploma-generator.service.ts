import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

import { DiplomaGrade, type Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { GRADE_LABELS } from './diploma.constants'

export type DiplomaDocKind = 'diploma' | 'addendum'

const UA_MONTHS_GEN = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
]
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DIPLOMA_INCLUDE = {
  components: { orderBy: { orderIndex: 'asc' as const } },
  template: true,
}

export type DiplomaRow = Prisma.DiplomaGetPayload<{ include: typeof DIPLOMA_INCLUDE }>

export interface GeneratedDoc {
  buffer: Buffer
  filename: string
}

@Injectable()
export class DiplomaGeneratorService {
  public constructor(private readonly prisma: PrismaService) {}

  public async generateOne(id: string, kind: DiplomaDocKind): Promise<GeneratedDoc> {
    const diploma = await this.prisma.diploma.findUnique({
      where: { id },
      include: DIPLOMA_INCLUDE,
    })
    if (!diploma) throw new NotFoundException('Диплом не знайдено.')
    return this.renderDiploma(diploma, kind)
  }

  /** Генерує всі дипломи партії одного виду в zip. */
  public async generateBulk(batchId: string, kind: DiplomaDocKind): Promise<GeneratedDoc> {
    const diplomas = await this.prisma.diploma.findMany({
      where: { batchId },
      include: DIPLOMA_INCLUDE,
    })
    if (diplomas.length === 0) throw new NotFoundException('У партії немає дипломів.')

    const zip = new PizZip()
    let added = 0
    for (const d of diplomas) {
      if (!this.templateBuffer(d, kind)) continue
      const doc = this.renderDiploma(d, kind)
      zip.file(doc.filename, doc.buffer)
      added++
    }
    if (added === 0) {
      throw new BadRequestException(
        'Жоден диплом не має шаблону з потрібним .docx. Призначте шаблони.',
      )
    }
    const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
    const label = kind === 'diploma' ? 'Дипломи' : 'Додатки'
    return { buffer, filename: `${label}.zip` }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private renderDiploma(diploma: DiplomaRow, kind: DiplomaDocKind): GeneratedDoc {
    const templateBuf = this.templateBuffer(diploma, kind)
    if (!templateBuf) {
      throw new BadRequestException(
        kind === 'diploma'
          ? 'Для шаблону не завантажено файл диплома (.docx).'
          : 'Для шаблону не завантажено файл додатка (.docx).',
      )
    }

    const zip = new PizZip(templateBuf)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    })
    doc.render(this.buildData(diploma))

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    }) as Buffer

    const who = `${diploma.lastNameUk}_${diploma.firstNameUk}`.replace(/\s+/g, '_')
    const label = kind === 'diploma' ? 'Диплом' : 'Додаток'
    return { buffer, filename: `${label}_${who}.docx` }
  }

  private templateBuffer(diploma: DiplomaRow, kind: DiplomaDocKind): Buffer | null {
    const bytes =
      kind === 'diploma' ? diploma.template?.diplomaDocx : diploma.template?.addendumDocx
    return bytes ? Buffer.from(bytes) : null
  }

  // ── Data for docxtemplater ───────────────────────────────────────────────────

  /** Публічний для тестів повноти заповнення плейсхолдерів. */
  public buildData(d: DiplomaRow): Record<string, unknown> {
    const total = d.components.reduce(
      (s, c) => s + (c.ects === null ? 0 : Number(c.ects)),
      0,
    )
    const t = d.template

    return {
      // Особа
      lastNameUk: d.lastNameUk,
      firstNameUk: d.firstNameUk,
      lastNameEn: d.lastNameEn ?? '',
      firstNameEn: d.firstNameEn ?? '',
      fullNameUk: `${d.firstNameUk} ${d.lastNameUk}`.trim(),
      fullNameEn: `${d.firstNameEn ?? ''} ${d.lastNameEn ?? ''}`.trim(),
      birthday: this.fmtBirthday(d.birthday),
      edeboPersonCode: d.edeboPersonCode ?? '',
      personId: d.personId ?? '',               // §1.4 — код картки фіз. особи
      personEducationId: d.personEducationId ?? '',
      // Документ
      documentSeries: d.documentSeries ?? '',
      documentNumber: d.documentNumber ?? '',
      supplementId: d.supplementId ?? '',
      issueDate: this.fmtBirthday(d.issueDate),   // DD/MM/YYYY — формат §7.1
      issueDateUk: this.fmtUaDate(d.issueDate),
      issueDateEn: this.fmtEnDate(d.issueDate),
      graduateYear: d.graduateDate ? String(d.graduateDate.getUTCFullYear()) : '',
      // Академічне (per-diploma, з XML ЄДЕБО)
      specialityNameUk: d.specialityName ?? '',
      specialityNameEn: d.specialityNameEn ?? '',
      studyProgramNameUk: d.studyProgramName ?? '',
      studyProgramNameEn: d.studyProgramNameEn ?? '',
      qualificationName: d.qualificationName ?? '',
      accreditationName: d.accreditationName ?? '',
      accreditationNameEn: d.accreditationNameEn ?? '',
      groupName: d.studyGroupName ?? '',
      // Підпис / заклад
      universityNameUk: d.universityPrintName ?? '',
      universityNameEn: d.universityPrintNameEn ?? '',
      bossFio: d.bossFio ?? '',
      bossFioEn: d.bossFioEn ?? '',
      bossPost: d.bossPost ?? '',
      bossPostEn: d.bossPostEn ?? '',
      bossInitialsSurname: this.initialsSurname(d.bossFio),
      // Вступний документ (§6.2.2 — з ЄДЕБО)
      entryDocumentUk: d.entryDocumentUk ?? '',
      entryDocumentEn: d.entryDocumentEn ?? '',
      // Зведена відомість
      qualificationWorkTitleUk: d.qualificationWorkTitleUk ?? '',
      qualificationWorkTitleEn: d.qualificationWorkTitleEn ?? '',
      isHonors: d.isHonors,
      totalEcts: this.fmtEcts(total),
      components: d.components.map((c, i) => ({
        index: i + 1,
        code: c.code ?? '',
        codeEn: c.code ?? '',   // код однаковий в обох мовах
        nameUk: c.nameUk,
        nameEn: c.nameEn ?? '',
        ects: c.ects === null ? '' : this.fmtEcts(Number(c.ects)),
        gradeUk: c.grade ? GRADE_LABELS[c.grade as DiplomaGrade].uk : '',
        gradeEn: c.grade ? GRADE_LABELS[c.grade as DiplomaGrade].en : '',
      })),
      // Шаблонні поля (однакові для всіх дипломів одного шаблону)
      specialityCode: t?.specialtyCode ?? '',
      qualificationNameUk: t?.qualificationNameUk ?? '',
      qualificationNameUk2: t?.qualificationNameUk2 ?? '',
      qualificationNameEn: t?.qualificationNameEn ?? '',
      qualificationNameEn2: t?.qualificationNameEn2 ?? '',
      degreeNameUk: t?.degreeNameUk ?? '',
      degreeNameEn: t?.degreeNameEn ?? '',
      studyPeriod: this.studyPeriod(d, t?.studyPeriod ?? null),
      accrCertSeries: t?.accrCertSeries ?? '',
      accrCertNumber: t?.accrCertNumber ?? '',
      accrCertDate: t?.accrCertDate ?? '',
      accrProtocolNumber: t?.accrProtocolNumber ?? '',
    }
  }

  // ── Formatting ───────────────────────────────────────────────────────────────

  private fmtEcts(n: number): string {
    return n.toFixed(1).replace('.', ',')
  }

  /**
   * Період навчання §7.1: «{початок}-{кінець}» у форматі DD/MM/YYYY.
   * Пріоритет: Student.educationDateBegin/End (studyDateBegin/End) →
   * далі «01/09/{entryYearEnd}-{graduateDate}» → рядок шаблону.
   */
  private studyPeriod(
    d: DiplomaRow,
    templatePeriod: string | null,
  ): string {
    if (d.studyDateBegin && d.studyDateEnd) {
      return `${this.fmtBirthday(d.studyDateBegin)}-${this.fmtBirthday(d.studyDateEnd)}`
    }
    if (d.entryYearEnd && d.graduateDate) {
      return `01/09/${d.entryYearEnd}-${this.fmtBirthday(d.graduateDate)}`
    }
    return templatePeriod ?? ''
  }

  private fmtBirthday(date: Date | null): string {
    if (!date) return ''
    const dd = String(date.getUTCDate()).padStart(2, '0')
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${date.getUTCFullYear()}`
  }

  private fmtUaDate(date: Date | null): string {
    if (!date) return ''
    return `«${String(date.getUTCDate()).padStart(2, '0')}» ${UA_MONTHS_GEN[date.getUTCMonth()]} ${date.getUTCFullYear()} р.`
  }

  private fmtEnDate(date: Date | null): string {
    if (!date) return ''
    return `${date.getUTCDate()} ${EN_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
  }

  /** "Ірина ВАХОВИЧ" → "І. ВАХОВИЧ" (для §7.3.1). */
  private initialsSurname(fio: string | null): string {
    if (!fio) return ''
    const parts = fio.trim().split(/\s+/)
    if (parts.length < 2) return fio
    const surname = parts[parts.length - 1]
    const initials = parts.slice(0, -1).map((p) => `${p[0]}.`).join(' ')
    return `${initials} ${surname}`
  }
}
