import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { EdboService } from '@/edbo/core/edbo.service'
import { PrismaService } from '@/prisma/prisma.service'

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
	documentDateGet: string | null // дата видачі документа (DD.MM.YYYY)
	documentIssued: string | null // ким видано документ (заклад)
	documentIssuedUniversityFullName: string | null // історична назва закладу в ЄДЕБО
	isCancelled: boolean | null
	isDeleted: boolean | null
	isEntrantDocument: number | boolean | null
	yearEnd: number | null
	specClasifierName: string | null
}

/** Відповідь ЄДЕБО API `POST /api/accreditationSpecialities/list`. */
export interface EdboAccreditationRecord {
	certificateSpecialityId: number
	qualificationGroupId: number
	qualificationGroupName: string | null
	redactionId: number
	specialityId: number
	specialityName: string | null
	isBadSpecialization: boolean
	specializationId: number | null
	specializationName: string | null
	isCertificateExist: boolean
	certificateNumber: string | null
	certificateSeries: string | null
	certificateEndDate: string | null
	certificateAccrReason: string | null
	certificateAccrLevel: string | null
	certificateIssueDate: string | null
	certificateBlankNumber: string | null
	certificateReceiveDate: string | null
	certificatePrevDocument: string | null
	certificateSigner: string | null
	accreditationInstitutionId: number
	accreditationInstitutionName: string | null
	certificateProlongInfo: string | null
	isBadMark: boolean
}

/** Назва типу укр. → англ. для типових документів про освіту (підстава для вступу). */
const DOC_TYPE_EN: { match: RegExp; en: string }[] = [
	{
		match: /базов\w* середн\w*/i,
		en: 'Certificate of Basic Secondary Education'
	},
	{
		match: /повн\w* загальн\w* середн\w*/i,
		en: 'Certificate of Complete General Secondary Education'
	},
	{
		match: /професійн\w*-?технічн\w*/i,
		en: 'Diploma of Vocational Education'
	},
	{
		match: /фахов\w* молодш\w*/i,
		en: 'Diploma of Professional Junior Bachelor'
	},
	{ match: /молодш\w* спеціаліст/i, en: 'Diploma of Junior Specialist' },
	{ match: /бакалавр/i, en: "Bachelor's Diploma" }
]

@Injectable()
export class DiplomaEdboService {
	private readonly logger = new Logger(DiplomaEdboService.name)

	public constructor(
		private readonly prisma: PrismaService,
		private readonly edbo: EdboService,
		private readonly configService: ConfigService
	) {}

	/**
	 * Для кожного диплома партії з `edeboPersonCode` тягне документи особи з ЄДЕБО,
	 * визначає документ-підставу для вступу та зберігає `entryDocumentUk/En`, `entryYearEnd`.
	 */
	public async syncEntryDocuments(
		batchId: string
	): Promise<{ updated: number; skipped: number }> {
		const batch = await this.prisma.diplomaBatch.findUnique({
			where: { id: batchId }
		})
		if (!batch) throw new NotFoundException('Партію не знайдено.')

		const diplomas = await this.prisma.diploma.findMany({
			where: { batchId },
			select: {
				id: true,
				edeboPersonCode: true,
				documentNumber: true,
				personEducationId: true
			}
		})

		// Період навчання §7.1 — локально зі Student (educationDateBegin/End).
		const students = await this.prisma.student.findMany({
			select: {
				personCodeU: true,
				educationId: true,
				personId: true,
				educationDateBegin: true,
				educationDateEnd: true
			}
		})
		const studentByCode = new Map(students.map(s => [s.personCodeU, s]))
		const studentByEduId = new Map(students.map(s => [s.educationId, s]))

		let updated = 0
		let skipped = 0

		for (const d of diplomas) {
			const student =
				(d.edeboPersonCode
					? studentByCode.get(d.edeboPersonCode)
					: undefined) ??
				(d.personEducationId != null
					? studentByEduId.get(d.personEducationId)
					: undefined)

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
						d.edeboPersonCode
					)) as unknown as EdboPhysPersonDocument[]
					const entry = this.pickEntryDocument(docs, d.documentNumber)
					if (entry) {
						data.entryDocumentUk = this.formatUk(entry)
						data.entryDocumentEn = this.formatEn(entry)
						data.entryYearEnd = entry.yearEnd ?? null
					}
				} catch (e) {
					this.logger.warn(
						`Не вдалося отримати документи для ${d.edeboPersonCode}: ${String(e)}`
					)
				}
			}

			if (Object.keys(data).length === 0) {
				skipped++
				continue
			}
			await this.prisma.diploma.update({ where: { id: d.id }, data })
			updated++
		}

		this.logger.log(
			`Diploma batch ${batchId}: entry documents synced (updated=${updated}, skipped=${skipped})`
		)
		return { updated, skipped }
	}

	// ── Accreditation sync ─────────────────────────────────────────────────────

	/**
	 * Підтягує дані акредитації з ЄДЕБО для всіх активних шаблонів дипломів
	 * та оновлює поля accredit* на `DiplomaTemplate`.
	 *
	 * Викликає `POST /api/accreditationSpecialities/list` для кожного унікального
	 * коду спеціальності серед шаблонів і матчить за `specialityId` (код спеціальності).
	 */
	public async syncAccreditationData(): Promise<{
		updated: number
		skipped: number
		notFound: number
	}> {
		const templates = await this.prisma.diplomaTemplate.findMany({
			where: { isActive: true },
			select: { id: true, specialtyCode: true, specialtyName: true }
		})

		if (templates.length === 0) {
			this.logger.log(
				'Немає активних шаблонів для синхронізації акредитації'
			)
			return { updated: 0, skipped: 0, notFound: 0 }
		}

		// Запитуємо всі акредитації закладу (max 500 записів).
		let allAccreditations: EdboAccreditationRecord[]
		try {
			allAccreditations = await this.fetchAccreditations()
		} catch (e) {
			this.logger.error(
				`Помилка отримання акредитацій з ЄДЕБО: ${String(e)}`
			)
			return { updated: 0, skipped: 0, notFound: templates.length }
		}

		this.logger.log(
			`Отримано ${allAccreditations.length} записів акредитації з ЄДЕБО`
		)

		let updated = 0
		let notFound = 0

		for (const t of templates) {
			const accred = this.findAccreditation(
				{
					specialtyCode: t.specialtyCode,
					specialtyName: t.specialtyName
				},
				allAccreditations
			)
			if (!accred) {
				notFound++
				this.logger.warn(
					`Акредитацію для шаблону ${t.id} (${t.specialtyCode ?? t.specialtyName ?? '—'}) не знайдено в ЄДЕБО`
				)
				continue
			}

			await this.prisma.diplomaTemplate.update({
				where: { id: t.id },
				data: {
					accrCertSeries: accred.certificateSeries ?? null,
					accrCertNumber: accred.certificateNumber ?? null,
					accrCertDate: accred.certificateIssueDate ?? null,
					accrCertEndDate: accred.certificateEndDate ?? null,
					accrProtocolNumber: accred.certificateAccrReason ?? null,
					accrInstitutionName:
						accred.accreditationInstitutionName ?? null,
					accrInstitutionNameEn: null // ЄДЕБО не повертає англійську назву органу акредитації
				}
			})
			updated++
		}

		this.logger.log(
			`Акредитацію оновлено: ${updated} шаблонів, не знайдено: ${notFound}`
		)
		return { updated, skipped: 0, notFound }
	}

	/**
	 * Пошук акредитації ЄДЕБО для спеціальності за `search` (код або назва).
	 * Використовується frontend-ом для перегляду наявних сертифікатів закладу.
	 * Без `search` повертає всі діючі сертифікати.
	 */
	public async lookupAccreditation(
		search?: string
	): Promise<EdboAccreditationRecord[]> {
		const valid = (await this.fetchAccreditations()).filter(
			a => a.isCertificateExist
		)

		const q = search?.trim()
		if (!q) return valid

		const normalized = this.normalizeSpecName(q)
		return valid.filter(a => {
			const byCode = String(a.specialityId) === q
			const byName = a.specialityName
				? this.normalizeSpecName(a.specialityName).includes(normalized)
				: false
			return byCode || byName
		})
	}

	/**
	 * Матч акредитації для шаблону: спершу за кодом спеціальності (`specialityId`),
	 * далі — за назвою (з нормалізацією: нижній регістр, без апострофів/зайвих пробілів).
	 * Враховуються лише записи з діючим сертифікатом (`isCertificateExist`).
	 */
	public findAccreditation(
		template: {
			specialtyCode: string | null
			specialtyName: string | null
		},
		records: EdboAccreditationRecord[]
	): EdboAccreditationRecord | undefined {
		const valid = records.filter(r => r.isCertificateExist)

		const code = template.specialtyCode?.trim()
		if (code) {
			const byCode = valid.find(r => String(r.specialityId) === code)
			if (byCode) return byCode
		}

		const name = template.specialtyName?.trim()
		if (name) {
			const target = this.normalizeSpecName(name)
			return valid.find(r => {
				if (!r.specialityName) return false
				const recName = this.normalizeSpecName(r.specialityName)
				return (
					recName === target ||
					recName.includes(target) ||
					target.includes(recName)
				)
			})
		}

		return undefined
	}

	/** Запит усіх акредитацій закладу з ЄДЕБО (max 500 записів). */
	private async fetchAccreditations(): Promise<EdboAccreditationRecord[]> {
		const universityId = Number(
			this.configService.getOrThrow<string>('EDEBO_CODE')
		)
		const result = await this.edbo.post<unknown>(
			'/api/accreditationSpecialities/list',
			{
				UniversityId: universityId,
				pageSize: 500
			}
		)
		return Array.isArray(result)
			? (result as EdboAccreditationRecord[])
			: []
	}

	/** Нормалізація назви спеціальності для нечіткого матчингу (регістр, апострофи, пробіли). */
	private normalizeSpecName(s: string): string {
		return s
			.toLowerCase()
			.replace(/['’ʼ`‘]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	/**
	 * Документ-підстава для вступу: серед документів про освіту (isEntrantDocument),
	 * не анульованих, виключаючи диплом, що видається (за номером). Якщо кількох —
	 * беремо з найменшим роком закінчення (фундаментальна попередня освіта).
	 */
	private pickEntryDocument(
		docs: EdboPhysPersonDocument[],
		ownDocumentNumber: string | null
	): EdboPhysPersonDocument | null {
		const candidates = docs.filter(
			x =>
				this.truthy(x.isEntrantDocument) &&
				!x.isCancelled &&
				!x.isDeleted &&
				!!x.personDocumentTypeName &&
				(ownDocumentNumber == null ||
					x.documentNumbers !== ownDocumentNumber)
		)
		if (candidates.length === 0) return null

		return candidates.reduce((best, cur) =>
			(cur.yearEnd ?? Number.MAX_SAFE_INTEGER) <
			(best.yearEnd ?? Number.MAX_SAFE_INTEGER)
				? cur
				: best
		)
	}

	private formatUk(doc: EdboPhysPersonDocument): string {
		const parts: string[] = []
		const typeName = doc.personDocumentTypeName?.trim()
		const sn = [doc.documentSeries, doc.documentNumbers]
			.filter(Boolean)
			.join(' ')
			.trim()

		if (typeName) parts.push(typeName)
		if (sn) parts.push(sn)

		const institution =
			doc.documentIssuedUniversityFullName?.trim() ??
			doc.documentIssued?.trim()
		if (institution) parts.push(institution)

		const dateStr = this.normalizeDate(doc.documentDateGet)
		if (dateStr) parts.push(dateStr)

		return parts.join(', ')
	}

	private formatEn(doc: EdboPhysPersonDocument): string {
		const typeUk = doc.personDocumentTypeName ?? ''
		const en = DOC_TYPE_EN.find(m => m.match.test(typeUk))?.en
		if (!en) return ''

		const parts: string[] = [en]
		const sn = [doc.documentSeries, doc.documentNumbers]
			.filter(Boolean)
			.join(' ')
			.trim()
		if (sn) parts.push(`No. ${sn}`)

		const institution =
			doc.documentIssuedUniversityFullName?.trim() ??
			doc.documentIssued?.trim()
		if (institution) parts.push(institution)

		const dateStr = this.normalizeDate(doc.documentDateGet)
		if (dateStr) parts.push(dateStr)

		return parts.join(', ')
	}

	/**
	 * Повертає дату у форматі DD.MM.YYYY для додатка.
	 * Підтримує вхідні формати: DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY.
	 * Повертає порожній рядок якщо дата відсутня або не вдалося розпарсити.
	 */
	private normalizeDate(raw: string | null): string {
		if (!raw) return ''
		const s = raw.trim()
		// DD.MM.YYYY — вже правильний формат
		const ddmmyyyy = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
		if (ddmmyyyy) return `${ddmmyyyy[1]}.${ddmmyyyy[2]}.${ddmmyyyy[3]}`
		// YYYY-MM-DD → DD.MM.YYYY
		const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
		if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`
		// DD/MM/YYYY → DD.MM.YYYY
		const slash = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
		if (slash) return `${slash[1]}.${slash[2]}.${slash[3]}`
		return ''
	}

	private truthy(v: number | boolean | null): boolean {
		return v === true || (typeof v === 'number' && v > 0)
	}
}
