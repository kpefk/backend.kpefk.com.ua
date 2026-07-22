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
	AcademicMobilityItemInputDto,
	CreateAcademicMobilityDto,
	UpdateAcademicMobilityDto
} from './dto/academic-mobility-request.dto'
import type {
	AcademicMobilityDto,
	AcademicMobilityItemDto
} from './dto/academic-mobility-response.dto'

const MOBILITY_INCLUDE = {
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
} satisfies Prisma.AcademicMobilityInclude

type MobilityRow = Prisma.AcademicMobilityGetPayload<{
	include: typeof MOBILITY_INCLUDE
}>

@Injectable()
export class AcademicMobilityService {
	private readonly logger = new Logger(AcademicMobilityService.name)

	public constructor(
		private readonly prisma: PrismaService,
		private readonly scaleService: GradeScaleService,
		private readonly gradesService: GradesService
	) {}

	public async list(): Promise<AcademicMobilityDto[]> {
		const rows = await this.prisma.academicMobility.findMany({
			include: MOBILITY_INCLUDE,
			orderBy: { createdAt: 'desc' }
		})
		return rows.map(r => this.toDto(r))
	}

	public async listByStudent(
		studentId: string
	): Promise<AcademicMobilityDto[]> {
		const rows = await this.prisma.academicMobility.findMany({
			where: { studentId },
			include: MOBILITY_INCLUDE,
			orderBy: { createdAt: 'desc' }
		})
		return rows.map(r => this.toDto(r))
	}

	public async get(id: string): Promise<AcademicMobilityDto> {
		const row = await this.prisma.academicMobility.findUnique({
			where: { id },
			include: MOBILITY_INCLUDE
		})
		if (!row) throw new NotFoundException('Запис мобільності не знайдено.')
		return this.toDto(row)
	}

	public async create(
		dto: CreateAcademicMobilityDto,
		userId: string
	): Promise<AcademicMobilityDto> {
		await this.prisma.student.findUniqueOrThrow({
			where: { id: dto.studentId }
		})
		this.assertPeriod(dto.periodFrom, dto.periodTo)
		const items = await this.resolveItems(dto.items)

		const row = await this.prisma.academicMobility.create({
			data: {
				studentId: dto.studentId,
				direction: dto.direction,
				partnerInstitutionName: dto.partnerInstitutionName,
				partnerUniversityId: dto.partnerUniversityId ?? null,
				country: dto.country ?? null,
				periodFrom: new Date(dto.periodFrom),
				periodTo: new Date(dto.periodTo),
				agreementNumber: dto.agreementNumber ?? null,
				agreementDate: dto.agreementDate
					? new Date(dto.agreementDate)
					: null,
				protocolNumber: dto.protocolNumber ?? null,
				protocolDate: dto.protocolDate
					? new Date(dto.protocolDate)
					: null,
				notes: dto.notes ?? null,
				decidedById: userId,
				items: { create: items }
			},
			include: MOBILITY_INCLUDE
		})
		this.logger.log(
			`[AcademicMobility] created id=${row.id} student=${dto.studentId}`
		)
		return this.toDto(row)
	}

	public async update(
		id: string,
		dto: UpdateAcademicMobilityDto
	): Promise<AcademicMobilityDto> {
		const existing = await this.requireDraft(id)

		const periodFrom = dto.periodFrom ?? existing.periodFrom.toISOString()
		const periodTo = dto.periodTo ?? existing.periodTo.toISOString()
		if (dto.periodFrom || dto.periodTo)
			this.assertPeriod(periodFrom, periodTo)

		const items = dto.items ? await this.resolveItems(dto.items) : null

		const row = await this.prisma.$transaction(async tx => {
			if (items) {
				await tx.academicMobilityItem.deleteMany({
					where: { mobilityId: existing.id }
				})
			}
			return tx.academicMobility.update({
				where: { id },
				data: {
					direction: dto.direction,
					partnerInstitutionName: dto.partnerInstitutionName,
					partnerUniversityId: dto.partnerUniversityId,
					country: dto.country,
					periodFrom: dto.periodFrom
						? new Date(dto.periodFrom)
						: undefined,
					periodTo: dto.periodTo ? new Date(dto.periodTo) : undefined,
					agreementNumber: dto.agreementNumber,
					agreementDate:
						dto.agreementDate === undefined
							? undefined
							: dto.agreementDate
								? new Date(dto.agreementDate)
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
				include: MOBILITY_INCLUDE
			})
		})
		return this.toDto(row)
	}

	public async confirm(
		id: string,
		userId: string
	): Promise<AcademicMobilityDto> {
		const mobility = await this.prisma.academicMobility.findUnique({
			where: { id },
			include: { items: true }
		})
		if (!mobility)
			throw new NotFoundException('Запис мобільності не знайдено.')
		if (mobility.status !== RecognitionStatus.DRAFT) {
			throw new BadRequestException(
				'Підтвердити можна лише чернетку (DRAFT).'
			)
		}
		if (mobility.items.length === 0) {
			throw new BadRequestException(
				'Немає жодного компонента для визнання.'
			)
		}

		await this.prisma.$transaction(async tx => {
			for (const item of mobility.items) {
				const gradeId = await this.gradesService.recordRecognizedGrade(
					tx,
					{
						studentId: mobility.studentId,
						curriculumComponentTermId:
							item.curriculumComponentTermId,
						academicYear: item.academicYear,
						finalGrade: item.finalGrade,
						nationalGradeOverride: item.nationalGrade,
						origin: GradeOrigin.MOBILITY,
						actorUserId: userId
					}
				)
				await tx.academicMobilityItem.update({
					where: { id: item.id },
					data: { generatedGradeId: gradeId }
				})
			}
			await tx.academicMobility.update({
				where: { id },
				data: { status: RecognitionStatus.CONFIRMED }
			})
		})
		this.logger.log(`[AcademicMobility] confirmed id=${id} by=${userId}`)
		return this.get(id)
	}

	public async revert(id: string): Promise<AcademicMobilityDto> {
		const mobility = await this.prisma.academicMobility.findUnique({
			where: { id },
			include: { items: true }
		})
		if (!mobility)
			throw new NotFoundException('Запис мобільності не знайдено.')
		if (mobility.status !== RecognitionStatus.CONFIRMED) {
			throw new BadRequestException(
				'Повернути в чернетку можна лише підтверджений запис.'
			)
		}

		await this.prisma.$transaction(async tx => {
			for (const item of mobility.items) {
				if (item.generatedGradeId) {
					await this.gradesService.deleteRecognizedGrade(
						tx,
						item.generatedGradeId
					)
					await tx.academicMobilityItem.update({
						where: { id: item.id },
						data: { generatedGradeId: null }
					})
				}
			}
			await tx.academicMobility.update({
				where: { id },
				data: { status: RecognitionStatus.DRAFT }
			})
		})
		this.logger.log(`[AcademicMobility] reverted id=${id}`)
		return this.get(id)
	}

	public async remove(id: string): Promise<void> {
		await this.requireDraft(id)
		await this.prisma.academicMobility.delete({ where: { id } })
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private assertPeriod(from: string, to: string): void {
		if (new Date(from) > new Date(to)) {
			throw new BadRequestException(
				'Дата початку мобільності пізніша за дату завершення.'
			)
		}
	}

	private async requireDraft(id: string) {
		const row = await this.prisma.academicMobility.findUnique({
			where: { id }
		})
		if (!row) throw new NotFoundException('Запис мобільності не знайдено.')
		if (row.status !== RecognitionStatus.DRAFT) {
			throw new BadRequestException(
				'Редагувати можна лише чернетку (DRAFT).'
			)
		}
		return row
	}

	private async resolveItems(inputs: AcademicMobilityItemInputDto[]): Promise<
		{
			curriculumComponentTermId: string
			academicYear: string
			creditsEcts: number
			finalGrade: number | null
			nationalGrade: NationalGrade
			partnerComponentName: string | null
		}[]
	> {
		const seen = new Set<string>()
		const resolved = []
		for (const item of inputs) {
			if (seen.has(item.curriculumComponentTermId)) {
				throw new BadRequestException(
					'Дубльований компонент у переліку визнання.'
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
				nationalGrade,
				partnerComponentName: item.partnerComponentName ?? null
			})
		}
		return resolved
	}

	private toDto(r: MobilityRow): AcademicMobilityDto {
		const items: AcademicMobilityItemDto[] = r.items.map(i => ({
			id: i.id,
			curriculumComponentTermId: i.curriculumComponentTermId,
			componentName: i.curriculumComponentTerm.component.name,
			componentCode: i.curriculumComponentTerm.component.code,
			semesterNumber: i.curriculumComponentTerm.semesterNumber,
			academicYear: i.academicYear,
			creditsEcts: Number(i.creditsEcts),
			finalGrade: i.finalGrade,
			nationalGrade: i.nationalGrade,
			partnerComponentName: i.partnerComponentName,
			generatedGradeId: i.generatedGradeId
		}))
		return {
			id: r.id,
			studentId: r.studentId,
			studentName: r.student.personFIO,
			direction: r.direction,
			status: r.status,
			partnerInstitutionName: r.partnerInstitutionName,
			partnerUniversityId: r.partnerUniversityId,
			country: r.country,
			periodFrom: r.periodFrom.toISOString(),
			periodTo: r.periodTo.toISOString(),
			agreementNumber: r.agreementNumber,
			agreementDate: r.agreementDate?.toISOString() ?? null,
			protocolNumber: r.protocolNumber,
			protocolDate: r.protocolDate?.toISOString() ?? null,
			notes: r.notes,
			totalEcts: items.reduce((sum, i) => sum + i.creditsEcts, 0),
			items,
			createdAt: r.createdAt.toISOString()
		}
	}
}
