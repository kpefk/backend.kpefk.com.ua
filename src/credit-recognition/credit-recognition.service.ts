import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import {
	GradeOrigin,
	type NationalGrade,
	type Prisma,
	RecognitionStatus,
	TermControlForm
} from '@prisma/client'

import { GradeScaleService } from '@/grades/grade-scale.service'
import { GradesService } from '@/grades/grades.service'
import { PrismaService } from '@/prisma/prisma.service'

import type {
	CreateCreditRecognitionDto,
	CreditRecognitionItemInputDto,
	UpdateCreditRecognitionDto
} from './dto/credit-recognition-request.dto'
import type {
	CreditRecognitionDto,
	CreditRecognitionItemDto
} from './dto/credit-recognition-response.dto'

/** Prisma-include для повного подання акту. */
const RECOGNITION_INCLUDE = {
	student: { select: { personFIO: true } },
	items: {
		include: {
			curriculumComponentTerm: {
				select: {
					semesterNumber: true,
					component: { select: { name: true, code: true } }
				}
			}
		},
		orderBy: {
			curriculumComponentTerm: { component: { name: 'asc' as const } }
		}
	}
} satisfies Prisma.CreditRecognitionInclude

type RecognitionRow = Prisma.CreditRecognitionGetPayload<{
	include: typeof RECOGNITION_INCLUDE
}>

@Injectable()
export class CreditRecognitionService {
	private readonly logger = new Logger(CreditRecognitionService.name)

	public constructor(
		private readonly prisma: PrismaService,
		private readonly scaleService: GradeScaleService,
		private readonly gradesService: GradesService
	) {}

	public async list(): Promise<CreditRecognitionDto[]> {
		const rows = await this.prisma.creditRecognition.findMany({
			include: RECOGNITION_INCLUDE,
			orderBy: { createdAt: 'desc' }
		})
		return rows.map(r => this.toDto(r))
	}

	public async listByStudent(
		studentId: string
	): Promise<CreditRecognitionDto[]> {
		const rows = await this.prisma.creditRecognition.findMany({
			where: { studentId },
			include: RECOGNITION_INCLUDE,
			orderBy: { createdAt: 'desc' }
		})
		return rows.map(r => this.toDto(r))
	}

	public async get(id: string): Promise<CreditRecognitionDto> {
		const row = await this.prisma.creditRecognition.findUnique({
			where: { id },
			include: RECOGNITION_INCLUDE
		})
		if (!row)
			throw new NotFoundException('Акт перезарахування не знайдено.')
		return this.toDto(row)
	}

	public async create(
		dto: CreateCreditRecognitionDto,
		userId: string
	): Promise<CreditRecognitionDto> {
		await this.prisma.student.findUniqueOrThrow({
			where: { id: dto.studentId }
		})
		const items = await this.resolveItems(dto.items)

		const row = await this.prisma.creditRecognition.create({
			data: {
				studentId: dto.studentId,
				type: dto.type,
				sourceInstitutionName: dto.sourceInstitutionName,
				sourceUniversityId: dto.sourceUniversityId ?? null,
				sourceDocument: dto.sourceDocument ?? null,
				sourceDocumentDate: dto.sourceDocumentDate
					? new Date(dto.sourceDocumentDate)
					: null,
				protocolNumber: dto.protocolNumber ?? null,
				protocolDate: dto.protocolDate
					? new Date(dto.protocolDate)
					: null,
				notes: dto.notes ?? null,
				decidedById: userId,
				items: { create: items }
			},
			include: RECOGNITION_INCLUDE
		})
		this.logger.log(
			`[CreditRecognition] created id=${row.id} student=${dto.studentId}`
		)
		return this.toDto(row)
	}

	public async update(
		id: string,
		dto: UpdateCreditRecognitionDto
	): Promise<CreditRecognitionDto> {
		const existing = await this.requireDraft(id)

		const items = dto.items ? await this.resolveItems(dto.items) : null

		const row = await this.prisma.$transaction(async tx => {
			if (items) {
				await tx.creditRecognitionItem.deleteMany({
					where: { recognitionId: existing.id }
				})
			}
			return tx.creditRecognition.update({
				where: { id },
				data: {
					type: dto.type,
					sourceInstitutionName: dto.sourceInstitutionName,
					sourceUniversityId: dto.sourceUniversityId,
					sourceDocument: dto.sourceDocument,
					sourceDocumentDate:
						dto.sourceDocumentDate === undefined
							? undefined
							: dto.sourceDocumentDate
								? new Date(dto.sourceDocumentDate)
								: null,
					protocolNumber: dto.protocolNumber,
					protocolDate:
						dto.protocolDate === undefined
							? undefined
							: dto.protocolDate
								? new Date(dto.protocolDate)
								: null,
					notes: dto.notes,
					...(items ? { items: { create: items } } : {})
				},
				include: RECOGNITION_INCLUDE
			})
		})
		return this.toDto(row)
	}

	/** Підтвердження: генерує перезараховані оцінки в заліковій книжці. */
	public async confirm(
		id: string,
		userId: string
	): Promise<CreditRecognitionDto> {
		const recognition = await this.prisma.creditRecognition.findUnique({
			where: { id },
			include: { items: true }
		})
		if (!recognition)
			throw new NotFoundException('Акт перезарахування не знайдено.')
		if (recognition.status !== RecognitionStatus.DRAFT) {
			throw new BadRequestException(
				'Підтвердити можна лише чернетку (DRAFT).'
			)
		}
		if (recognition.items.length === 0) {
			throw new BadRequestException(
				'Немає жодного компонента для перезарахування.'
			)
		}

		await this.prisma.$transaction(async tx => {
			for (const item of recognition.items) {
				const gradeId = await this.gradesService.recordRecognizedGrade(
					tx,
					{
						studentId: recognition.studentId,
						curriculumComponentTermId:
							item.curriculumComponentTermId,
						academicYear: item.academicYear,
						finalGrade: item.finalGrade,
						nationalGradeOverride: item.nationalGrade,
						origin: GradeOrigin.RECOGNIZED,
						actorUserId: userId
					}
				)
				await tx.creditRecognitionItem.update({
					where: { id: item.id },
					data: { generatedGradeId: gradeId }
				})
			}
			await tx.creditRecognition.update({
				where: { id },
				data: { status: RecognitionStatus.CONFIRMED }
			})
		})
		this.logger.log(`[CreditRecognition] confirmed id=${id} by=${userId}`)
		return this.get(id)
	}

	/** Реверт у чернетку (лише ADMINISTRATOR — гейт на рівні роуту): прибирає згенеровані оцінки. */
	public async revert(id: string): Promise<CreditRecognitionDto> {
		const recognition = await this.prisma.creditRecognition.findUnique({
			where: { id },
			include: { items: true }
		})
		if (!recognition)
			throw new NotFoundException('Акт перезарахування не знайдено.')
		if (recognition.status !== RecognitionStatus.CONFIRMED) {
			throw new BadRequestException(
				'Повернути в чернетку можна лише підтверджений акт.'
			)
		}

		await this.prisma.$transaction(async tx => {
			for (const item of recognition.items) {
				if (item.generatedGradeId) {
					await this.gradesService.deleteRecognizedGrade(
						tx,
						item.generatedGradeId
					)
					await tx.creditRecognitionItem.update({
						where: { id: item.id },
						data: { generatedGradeId: null }
					})
				}
			}
			await tx.creditRecognition.update({
				where: { id },
				data: { status: RecognitionStatus.DRAFT }
			})
		})
		this.logger.log(`[CreditRecognition] reverted id=${id}`)
		return this.get(id)
	}

	public async remove(id: string): Promise<void> {
		await this.requireDraft(id)
		await this.prisma.creditRecognition.delete({ where: { id } })
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private async requireDraft(id: string) {
		const row = await this.prisma.creditRecognition.findUnique({
			where: { id }
		})
		if (!row)
			throw new NotFoundException('Акт перезарахування не знайдено.')
		if (row.status !== RecognitionStatus.DRAFT) {
			throw new BadRequestException(
				'Редагувати можна лише чернетку (DRAFT).'
			)
		}
		return row
	}

	/** Резолвить+валідує оцінку кожного item за шкалою цільового компонента. */
	private async resolveItems(
		inputs: CreditRecognitionItemInputDto[]
	): Promise<
		{
			curriculumComponentTermId: string
			academicYear: string
			creditsEcts: number
			finalGrade: number | null
			nationalGrade: NationalGrade
		}[]
	> {
		const seen = new Set<string>()
		const resolved = []
		for (const item of inputs) {
			if (seen.has(item.curriculumComponentTermId)) {
				throw new BadRequestException(
					'Дубльований компонент у переліку перезарахування.'
				)
			}
			seen.add(item.curriculumComponentTermId)

			const term = await this.prisma.curriculumComponentTerm.findUnique({
				where: { id: item.curriculumComponentTermId },
				select: {
					controlForm: true,
					component: {
						select: {
							name: true,
							section: { select: { sectionType: true } }
						}
					}
				}
			})
			if (!term) {
				throw new BadRequestException(
					'Цільовий компонент навчального плану не знайдено.'
				)
			}

			const controlForm = term.controlForm ?? TermControlForm.EXAM
			const scale = this.scaleService.scaleFromSectionType(
				term.component.section.sectionType
			)

			let finalGrade: number | null
			let nationalGrade: NationalGrade
			if (controlForm === TermControlForm.CREDIT) {
				if (!item.nationalGradeOverride) {
					throw new BadRequestException(
						`Компонент «${term.component.name}» — залік: вкажіть Зараховано/Не зараховано.`
					)
				}
				this.scaleService.validateCreditGrade(
					item.nationalGradeOverride
				)
				finalGrade = null
				nationalGrade = item.nationalGradeOverride
			} else {
				this.scaleService.validateGrade(
					item.finalGrade ?? null,
					scale,
					controlForm
				)
				finalGrade = item.finalGrade ?? null
				nationalGrade = this.scaleService.toNationalGrade(
					finalGrade,
					scale,
					controlForm
				)
			}

			resolved.push({
				curriculumComponentTermId: item.curriculumComponentTermId,
				academicYear: item.academicYear,
				creditsEcts: item.creditsEcts,
				finalGrade,
				nationalGrade
			})
		}
		return resolved
	}

	private toDto(r: RecognitionRow): CreditRecognitionDto {
		const items: CreditRecognitionItemDto[] = r.items.map(i => ({
			id: i.id,
			curriculumComponentTermId: i.curriculumComponentTermId,
			componentName: i.curriculumComponentTerm.component.name,
			componentCode: i.curriculumComponentTerm.component.code,
			semesterNumber: i.curriculumComponentTerm.semesterNumber,
			academicYear: i.academicYear,
			creditsEcts: Number(i.creditsEcts),
			finalGrade: i.finalGrade,
			nationalGrade: i.nationalGrade,
			generatedGradeId: i.generatedGradeId
		}))
		return {
			id: r.id,
			studentId: r.studentId,
			studentName: r.student.personFIO,
			type: r.type,
			status: r.status,
			sourceInstitutionName: r.sourceInstitutionName,
			sourceUniversityId: r.sourceUniversityId,
			sourceDocument: r.sourceDocument,
			sourceDocumentDate: r.sourceDocumentDate?.toISOString() ?? null,
			protocolNumber: r.protocolNumber,
			protocolDate: r.protocolDate?.toISOString() ?? null,
			notes: r.notes,
			totalEcts: items.reduce((sum, i) => sum + i.creditsEcts, 0),
			items,
			createdAt: r.createdAt.toISOString()
		}
	}
}
