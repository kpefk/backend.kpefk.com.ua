import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'
import { EdboService } from '@/edbo/core/edbo.service'

/**
 * Підтягування з ЄДЕБО документа про освіту, що був підставою для вступу (§6.2.2 додатка),
 * через `POST api/physPersons/documents`. Заповнює `entryDocumentUk/En` та `entryYearEnd`
 * (рік закінчення попередньої освіти → старт навчання для §7.1 «Період навчання»).
 */

/** Підмножина полів PhysPersonDocumentsEntity, які нас цікавлять. */
interface EdboPhysPersonDocument {
  personDocumentTypeName: string | null
  documentSeries: string | null
  documentNumbers: string | null
  isCancelled: boolean | null
  isDeleted: boolean | null
  isEntrantDocument: number | boolean | null
  yearEnd: number | null
  specClasifierName: string | null
}

/** Назва типу укр. → англ. для типових документів про освіту (підстава для вступу). */
const DOC_TYPE_EN: { match: RegExp; en: string }[] = [
  { match: /базов\w* середн\w*/i, en: 'Certificate of Basic Secondary Education' },
  { match: /повн\w* загальн\w* середн\w*/i, en: 'Certificate of Complete General Secondary Education' },
  { match: /професійн\w*-?технічн\w*/i, en: 'Diploma of Vocational Education' },
  { match: /фахов\w* молодш\w*/i, en: 'Diploma of Professional Junior Bachelor' },
  { match: /молодш\w* спеціаліст/i, en: 'Diploma of Junior Specialist' },
  { match: /бакалавр/i, en: "Bachelor's Diploma" },
]

@Injectable()
export class DiplomaEdboService {
  private readonly logger = new Logger(DiplomaEdboService.name)

  public constructor(
    private readonly prisma: PrismaService,
    private readonly edbo: EdboService,
  ) {}

  /**
   * Для кожного диплома партії з `edeboPersonCode` тягне документи особи з ЄДЕБО,
   * визначає документ-підставу для вступу та зберігає `entryDocumentUk/En`, `entryYearEnd`.
   */
  public async syncEntryDocuments(
    batchId: string,
  ): Promise<{ updated: number; skipped: number }> {
    const batch = await this.prisma.diplomaBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw new NotFoundException('Партію не знайдено.')

    const diplomas = await this.prisma.diploma.findMany({
      where: { batchId },
      select: {
        id: true,
        edeboPersonCode: true,
        documentNumber: true,
        personEducationId: true,
      },
    })

    // Період навчання §7.1 — локально зі Student (educationDateBegin/End).
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

    let updated = 0
    let skipped = 0

    for (const d of diplomas) {
      const student =
        (d.edeboPersonCode ? studentByCode.get(d.edeboPersonCode) : undefined) ??
        (d.personEducationId != null ? studentByEduId.get(d.personEducationId) : undefined)

      const data: {
        entryDocumentUk?: string
        entryDocumentEn?: string
        entryYearEnd?: number | null
        personId?: number | null
        studyDateBegin?: Date | null
        studyDateEnd?: Date | null
      } = {}

      if (student) {
        data.personId = student.personId
        data.studyDateBegin = student.educationDateBegin
        data.studyDateEnd = student.educationDateEnd
      }

      if (d.edeboPersonCode) {
        try {
          const docs = (await this.edbo.getPersonDocumentsSync(
            d.edeboPersonCode,
          )) as unknown as EdboPhysPersonDocument[]
          const entry = this.pickEntryDocument(docs, d.documentNumber)
          if (entry) {
            data.entryDocumentUk = this.formatUk(entry)
            data.entryDocumentEn = this.formatEn(entry)
            data.entryYearEnd = entry.yearEnd ?? null
          }
        } catch (e) {
          this.logger.warn(`Не вдалося отримати документи для ${d.edeboPersonCode}: ${String(e)}`)
        }
      }

      if (Object.keys(data).length === 0) {
        skipped++
        continue
      }
      await this.prisma.diploma.update({ where: { id: d.id }, data })
      updated++
    }

    this.logger.log(`Diploma batch ${batchId}: entry documents synced (updated=${updated}, skipped=${skipped})`)
    return { updated, skipped }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Документ-підстава для вступу: серед документів про освіту (isEntrantDocument),
   * не анульованих, виключаючи диплом, що видається (за номером). Якщо кількох —
   * беремо з найменшим роком закінчення (фундаментальна попередня освіта).
   */
  private pickEntryDocument(
    docs: EdboPhysPersonDocument[],
    ownDocumentNumber: string | null,
  ): EdboPhysPersonDocument | null {
    const candidates = docs.filter(
      (x) =>
        this.truthy(x.isEntrantDocument) &&
        !x.isCancelled &&
        !x.isDeleted &&
        !!x.personDocumentTypeName &&
        (ownDocumentNumber == null || x.documentNumbers !== ownDocumentNumber),
    )
    if (candidates.length === 0) return null

    return candidates.reduce((best, cur) =>
      (cur.yearEnd ?? Number.MAX_SAFE_INTEGER) < (best.yearEnd ?? Number.MAX_SAFE_INTEGER)
        ? cur
        : best,
    )
  }

  private formatUk(doc: EdboPhysPersonDocument): string {
    const parts = [doc.personDocumentTypeName?.trim()]
    const sn = [doc.documentSeries, doc.documentNumbers].filter(Boolean).join(' ').trim()
    if (sn) parts.push(`№ ${sn}`)
    return parts.filter(Boolean).join(', ')
  }

  private formatEn(doc: EdboPhysPersonDocument): string {
    const typeUk = doc.personDocumentTypeName ?? ''
    const en = DOC_TYPE_EN.find((m) => m.match.test(typeUk))?.en
    if (!en) return ''
    const sn = [doc.documentSeries, doc.documentNumbers].filter(Boolean).join(' ').trim()
    return sn ? `${en}, No. ${sn}` : en
  }

  private truthy(v: number | boolean | null): boolean {
    return v === true || (typeof v === 'number' && v > 0)
  }
}
