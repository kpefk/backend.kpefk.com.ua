import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import {
	Prisma,
	SurveyQuestionType,
	SurveyStatus,
	UserRole
} from '@prisma/client'

import { activeStudentWhere } from '@/libs/common/active-student'
import { resolveOwnStudentId } from '@/libs/common/own-student'
import { PrismaService } from '@/prisma/prisma.service'

import type {
	CreateSurveyDto,
	SetSurveyQuestionsDto,
	SubmitSurveyDto,
	UpdateSurveyDto
} from './dto/survey-request.dto'
import type {
	StudentSurveyDto,
	SurveyAdminDto,
	SurveyQuestionDto,
	SurveyResultsDto
} from './dto/survey-response.dto'
import {
	computeQuestionResults,
	computeResponseRatePercent
} from './survey-results'
import {
	SCALE_MAX_ALLOWED,
	SCALE_MIN_ALLOWED,
	SURVEY_RATING_MAX,
	SURVEY_RATING_MIN
} from './surveys.constants'

const CHOICE_TYPES: readonly SurveyQuestionType[] = [
	'SINGLE_CHOICE',
	'MULTI_CHOICE',
	'DROPDOWN'
]

/** Prisma-select для адмін-подання кампанії. */
const ADMIN_INCLUDE = {
	questions: {
		orderBy: { order: 'asc' as const },
		include: { options: { orderBy: { order: 'asc' as const } } }
	},
	targetGroups: { include: { group: { select: { id: true, name: true } } } },
	_count: { select: { completions: true } }
} satisfies Prisma.SurveyInclude

type AdminRow = Prisma.SurveyGetPayload<{ include: typeof ADMIN_INCLUDE }>

@Injectable()
export class SurveysService {
	private readonly logger = new Logger(SurveysService.name)

	public constructor(private readonly prisma: PrismaService) {}

	// ── Admin: CRUD ────────────────────────────────────────────────────────────

	public async list(): Promise<SurveyAdminDto[]> {
		const rows = await this.prisma.survey.findMany({
			include: ADMIN_INCLUDE,
			orderBy: { createdAt: 'desc' }
		})
		return rows.map(r => this.toAdminDto(r))
	}

	public async get(id: string): Promise<SurveyAdminDto> {
		const row = await this.prisma.survey.findUnique({
			where: { id },
			include: ADMIN_INCLUDE
		})
		if (!row) throw new NotFoundException('Опитування не знайдено.')
		return this.toAdminDto(row)
	}

	public async create(
		dto: CreateSurveyDto,
		userId: string
	): Promise<SurveyAdminDto> {
		const row = await this.prisma.survey.create({
			data: {
				title: dto.title,
				description: dto.description ?? null,
				isAnonymous: dto.isAnonymous ?? true,
				opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
				closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
				createdById: userId,
				targetGroups: dto.groupIds?.length
					? { create: dto.groupIds.map(groupId => ({ groupId })) }
					: undefined
			},
			include: ADMIN_INCLUDE
		})
		this.logger.log(`[Survey] created id=${row.id} by=${userId}`)
		return this.toAdminDto(row)
	}

	public async update(
		id: string,
		dto: UpdateSurveyDto
	): Promise<SurveyAdminDto> {
		const survey = await this.requireSurvey(id)
		if (survey.status !== SurveyStatus.DRAFT) {
			throw new BadRequestException(
				'Редагувати можна лише чернетку (DRAFT).'
			)
		}

		const row = await this.prisma.$transaction(async tx => {
			if (dto.groupIds !== undefined) {
				await tx.surveyTargetGroup.deleteMany({
					where: { surveyId: id }
				})
				if (dto.groupIds.length > 0) {
					await tx.surveyTargetGroup.createMany({
						data: dto.groupIds.map(groupId => ({
							surveyId: id,
							groupId
						}))
					})
				}
			}
			return tx.survey.update({
				where: { id },
				data: {
					title: dto.title,
					description: dto.description,
					isAnonymous: dto.isAnonymous,
					opensAt:
						dto.opensAt === undefined
							? undefined
							: dto.opensAt
								? new Date(dto.opensAt)
								: null,
					closesAt:
						dto.closesAt === undefined
							? undefined
							: dto.closesAt
								? new Date(dto.closesAt)
								: null
				},
				include: ADMIN_INCLUDE
			})
		})
		return this.toAdminDto(row)
	}

	/** Повна заміна набору питань (лише DRAFT — щоб не осиротити відповіді). */
	public async setQuestions(
		id: string,
		dto: SetSurveyQuestionsDto
	): Promise<SurveyAdminDto> {
		const survey = await this.requireSurvey(id)
		if (survey.status !== SurveyStatus.DRAFT) {
			throw new BadRequestException(
				'Питання можна змінювати лише в чернетці (DRAFT).'
			)
		}

		// Валідація за типом ще до транзакції.
		for (const q of dto.questions) {
			if (CHOICE_TYPES.includes(q.type)) {
				const opts = (q.options ?? [])
					.map(o => o.trim())
					.filter(o => o !== '')
				if (opts.length < 2) {
					throw new BadRequestException(
						`Питання «${q.text}» потребує щонайменше 2 варіанти.`
					)
				}
			}
			if (q.type === 'SCALE') {
				const min = q.scaleMin ?? SCALE_MIN_ALLOWED
				const max = q.scaleMax ?? 5
				if (
					min >= max ||
					min < SCALE_MIN_ALLOWED ||
					max > SCALE_MAX_ALLOWED
				) {
					throw new BadRequestException(
						`Питання «${q.text}»: некоректні межі шкали.`
					)
				}
			}
		}

		const row = await this.prisma.$transaction(async tx => {
			await tx.surveyQuestion.deleteMany({ where: { surveyId: id } })
			// Create з вкладеними опціями (createMany не підтримує nested) — по одному питанню.
			for (const [idx, q] of dto.questions.entries()) {
				const isChoice = CHOICE_TYPES.includes(q.type)
				const isScale = q.type === 'SCALE'
				const opts = isChoice
					? (q.options ?? []).map(o => o.trim()).filter(o => o !== '')
					: []
				await tx.surveyQuestion.create({
					data: {
						surveyId: id,
						order: idx + 1,
						text: q.text,
						type: q.type,
						required: q.required ?? true,
						scaleMin: isScale
							? (q.scaleMin ?? SCALE_MIN_ALLOWED)
							: null,
						scaleMax: isScale ? (q.scaleMax ?? 5) : null,
						scaleMinLabel: isScale
							? q.scaleMinLabel?.trim() || null
							: null,
						scaleMaxLabel: isScale
							? q.scaleMaxLabel?.trim() || null
							: null,
						options:
							opts.length > 0
								? {
										create: opts.map((text, oi) => ({
											order: oi,
											text
										}))
									}
								: undefined
					}
				})
			}
			return tx.survey.findUniqueOrThrow({
				where: { id },
				include: ADMIN_INCLUDE
			})
		})
		return this.toAdminDto(row)
	}

	/**
	 * Переходи статусу:
	 *  - Вперед: DRAFT→OPEN (потрібно ≥1 питання), OPEN→CLOSED.
	 *  - Повернення в чернетку (OPEN/CLOSED→DRAFT) — лише для ADMINISTRATOR, навіть після
	 *    публікації. Дозволяє виправити помилку в уже опублікованій кампанії.
	 */
	public async setStatus(
		id: string,
		status: SurveyStatus,
		role: UserRole
	): Promise<SurveyAdminDto> {
		const survey = await this.prisma.survey.findUnique({
			where: { id },
			include: { _count: { select: { questions: true } } }
		})
		if (!survey) throw new NotFoundException('Опитування не знайдено.')

		const isForward =
			(survey.status === SurveyStatus.DRAFT &&
				status === SurveyStatus.OPEN) ||
			(survey.status === SurveyStatus.OPEN &&
				status === SurveyStatus.CLOSED)
		const isRevertToDraft =
			status === SurveyStatus.DRAFT &&
			survey.status !== SurveyStatus.DRAFT

		if (isRevertToDraft && role !== UserRole.ADMINISTRATOR) {
			throw new ForbiddenException(
				'Повернути опитування в чернетку може лише адміністратор.'
			)
		}
		if (!isForward && !isRevertToDraft) {
			throw new BadRequestException(
				`Перехід ${survey.status} → ${status} не дозволено.`
			)
		}
		if (status === SurveyStatus.OPEN && survey._count.questions === 0) {
			throw new BadRequestException(
				'Не можна відкрити опитування без питань.'
			)
		}

		const row = await this.prisma.survey.update({
			where: { id },
			data: { status },
			include: ADMIN_INCLUDE
		})
		this.logger.log(
			`[Survey] id=${id} status ${survey.status} → ${status} by role=${role}`
		)
		return this.toAdminDto(row)
	}

	public async remove(id: string): Promise<void> {
		const survey = await this.requireSurvey(id)
		if (survey.status !== SurveyStatus.DRAFT) {
			throw new BadRequestException(
				'Видалити можна лише чернетку (DRAFT).'
			)
		}
		await this.prisma.survey.delete({ where: { id } })
	}

	// ── Admin: results ─────────────────────────────────────────────────────────

	public async getResults(id: string): Promise<SurveyResultsDto> {
		const survey = await this.prisma.survey.findUnique({
			where: { id },
			include: {
				questions: {
					orderBy: { order: 'asc' },
					include: { options: { orderBy: { order: 'asc' } } }
				},
				targetGroups: {
					include: { group: { select: { id: true, name: true } } }
				},
				completions: {
					select: { student: { select: { groupId: true } } }
				}
			}
		})
		if (!survey) throw new NotFoundException('Опитування не знайдено.')

		// Текстові відповіді сортуються за id (uuid) — без часової кореляції для анонімних.
		const answers = await this.prisma.surveyAnswer.findMany({
			where: { question: { surveyId: id } },
			select: {
				questionId: true,
				ratingValue: true,
				textValue: true,
				selectedOptionIds: true
			},
			orderBy: { id: 'asc' }
		})

		const targetGroupIds = survey.targetGroups.map(t => t.groupId)
		const targetWhere: Prisma.StudentWhereInput = {
			...activeStudentWhere(),
			...(targetGroupIds.length > 0
				? { groupId: { in: targetGroupIds } }
				: {})
		}
		const totalTargets = await this.prisma.student.count({
			where: targetWhere
		})

		// Per-group розбивка лише коли кампанія таргетована на конкретні групи.
		const byGroup = await Promise.all(
			survey.targetGroups.map(async t => {
				const targets = await this.prisma.student.count({
					where: { ...activeStudentWhere(), groupId: t.groupId }
				})
				const completions = survey.completions.filter(
					c => c.student.groupId === t.groupId
				).length
				return {
					groupId: t.group.id,
					groupName: t.group.name,
					targets,
					completions
				}
			})
		)

		return {
			surveyId: survey.id,
			title: survey.title,
			isAnonymous: survey.isAnonymous,
			status: survey.status,
			totalTargets,
			totalCompletions: survey.completions.length,
			responseRatePercent: computeResponseRatePercent(
				totalTargets,
				survey.completions.length
			),
			byGroup,
			questions: computeQuestionResults(
				survey.questions.map(q => ({
					id: q.id,
					order: q.order,
					text: q.text,
					type: q.type,
					options: q.options.map(o => ({
						id: o.id,
						order: o.order,
						text: o.text
					})),
					scaleMin: q.scaleMin,
					scaleMax: q.scaleMax
				})),
				answers.map(a => ({
					questionId: a.questionId,
					ratingValue: a.ratingValue,
					textValue: a.textValue,
					selectedOptionIds: a.selectedOptionIds
				}))
			)
		}
	}

	// ── Student: available surveys + submit ────────────────────────────────────

	public async listMy(userId: string): Promise<StudentSurveyDto[]> {
		const studentId = await resolveOwnStudentId(this.prisma, userId)
		const student = await this.prisma.student.findUniqueOrThrow({
			where: { id: studentId },
			select: { groupId: true }
		})

		const now = new Date()
		const rows = await this.prisma.survey.findMany({
			where: {
				status: SurveyStatus.OPEN,
				AND: [
					{ OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
					{ OR: [{ closesAt: null }, { closesAt: { gte: now } }] },
					{
						OR: [
							{ targetGroups: { none: {} } },
							...(student.groupId
								? [
										{
											targetGroups: {
												some: {
													groupId: student.groupId
												}
											}
										}
									]
								: [])
						]
					}
				]
			},
			include: {
				questions: {
					orderBy: { order: 'asc' },
					include: { options: { orderBy: { order: 'asc' } } }
				},
				completions: { where: { studentId }, select: { id: true } }
			},
			orderBy: { createdAt: 'desc' }
		})

		return rows.map(r => ({
			id: r.id,
			title: r.title,
			description: r.description,
			isAnonymous: r.isAnonymous,
			closesAt: r.closesAt?.toISOString() ?? null,
			completed: r.completions.length > 0,
			questions: r.questions.map(q => this.toQuestionDto(q))
		}))
	}

	public async submit(
		surveyId: string,
		dto: SubmitSurveyDto,
		userId: string
	): Promise<void> {
		const studentId = await resolveOwnStudentId(this.prisma, userId)
		const student = await this.prisma.student.findUniqueOrThrow({
			where: { id: studentId },
			select: { groupId: true }
		})

		const survey = await this.prisma.survey.findUnique({
			where: { id: surveyId },
			include: {
				questions: { include: { options: { select: { id: true } } } },
				targetGroups: { select: { groupId: true } }
			}
		})
		if (!survey) throw new NotFoundException('Опитування не знайдено.')

		const now = new Date()
		if (survey.status !== SurveyStatus.OPEN) {
			throw new BadRequestException('Опитування не відкрите.')
		}
		if (survey.opensAt && survey.opensAt > now) {
			throw new BadRequestException('Опитування ще не почалося.')
		}
		if (survey.closesAt && survey.closesAt < now) {
			throw new BadRequestException('Опитування вже завершилося.')
		}
		const targeted =
			survey.targetGroups.length === 0 ||
			(student.groupId !== null &&
				survey.targetGroups.some(t => t.groupId === student.groupId))
		if (!targeted) {
			throw new BadRequestException(
				'Це опитування не адресоване вашій групі.'
			)
		}

		// Валідація відповідей проти питань.
		const questionById = new Map(survey.questions.map(q => [q.id, q]))
		const answeredIds = new Set<string>()
		for (const a of dto.answers) {
			const q = questionById.get(a.questionId)
			if (!q)
				throw new BadRequestException('Відповідь на невідоме питання.')
			if (answeredIds.has(a.questionId)) {
				throw new BadRequestException('Дублікат відповіді на питання.')
			}
			answeredIds.add(a.questionId)
			this.validateAnswer(
				q,
				a.ratingValue,
				a.selectedOptionIds,
				a.textValue
			)
		}
		for (const q of survey.questions) {
			if (q.required && !answeredIds.has(q.id)) {
				throw new BadRequestException(
					`Питання «${q.text}» обовʼязкове.`
				)
			}
		}

		// Транзакція: completion (unique блокує повторне проходження) + відповіді.
		// Для анонімних кампаній studentId у відповідях НЕ зберігається.
		const answerStudentId = survey.isAnonymous ? null : studentId
		try {
			await this.prisma.$transaction([
				this.prisma.surveyCompletion.create({
					data: { surveyId, studentId }
				}),
				this.prisma.surveyAnswer.createMany({
					data: dto.answers.map(a => {
						const q = questionById.get(a.questionId)!
						const isNumeric =
							q.type === 'RATING' || q.type === 'SCALE'
						const isChoice = CHOICE_TYPES.includes(q.type)
						const isText =
							q.type === 'TEXT' || q.type === 'PARAGRAPH'
						return {
							questionId: a.questionId,
							studentId: answerStudentId,
							ratingValue: isNumeric
								? (a.ratingValue ?? null)
								: null,
							selectedOptionIds: isChoice
								? (a.selectedOptionIds ?? [])
								: [],
							textValue: isText
								? (a.textValue?.trim() ?? null)
								: null
						}
					})
				})
			])
		} catch (err) {
			if (
				err instanceof Prisma.PrismaClientKnownRequestError &&
				err.code === 'P2002'
			) {
				throw new BadRequestException('Ви вже проходили це опитування.')
			}
			throw err
		}
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	private async requireSurvey(id: string) {
		const survey = await this.prisma.survey.findUnique({ where: { id } })
		if (!survey) throw new NotFoundException('Опитування не знайдено.')
		return survey
	}

	/** Перевіряє, що відповідь відповідає типу питання (значення/опції/межі). */
	private validateAnswer(
		q: {
			text: string
			type: SurveyQuestionType
			scaleMin: number | null
			scaleMax: number | null
			options: { id: string }[]
		},
		ratingValue: number | undefined,
		selectedOptionIds: string[] | undefined,
		textValue: string | undefined
	): void {
		const fail = () =>
			new BadRequestException(
				`Відповідь на питання «${q.text}» не відповідає його типу.`
			)

		if (q.type === 'RATING') {
			if (ratingValue === undefined) throw fail()
			if (
				ratingValue < SURVEY_RATING_MIN ||
				ratingValue > SURVEY_RATING_MAX
			)
				throw fail()
			return
		}
		if (q.type === 'SCALE') {
			const min = q.scaleMin ?? SCALE_MIN_ALLOWED
			const max = q.scaleMax ?? SCALE_MAX_ALLOWED
			if (
				ratingValue === undefined ||
				ratingValue < min ||
				ratingValue > max
			)
				throw fail()
			return
		}
		if (CHOICE_TYPES.includes(q.type)) {
			const selected = selectedOptionIds ?? []
			if (selected.length === 0) throw fail()
			if (q.type !== 'MULTI_CHOICE' && selected.length !== 1) {
				// SINGLE_CHOICE / DROPDOWN — рівно один варіант.
				throw fail()
			}
			const validIds = new Set(q.options.map(o => o.id))
			if (new Set(selected).size !== selected.length) throw fail() // дублікати
			for (const optId of selected) {
				if (!validIds.has(optId)) throw fail()
			}
			return
		}
		// TEXT / PARAGRAPH
		if (textValue === undefined || textValue.trim() === '') throw fail()
	}

	private toQuestionDto(q: {
		id: string
		order: number
		text: string
		type: SurveyQuestionDto['type']
		required: boolean
		scaleMin: number | null
		scaleMax: number | null
		scaleMinLabel: string | null
		scaleMaxLabel: string | null
		options: { id: string; order: number; text: string }[]
	}): SurveyQuestionDto {
		return {
			id: q.id,
			order: q.order,
			text: q.text,
			type: q.type,
			required: q.required,
			options: q.options.map(o => ({
				id: o.id,
				order: o.order,
				text: o.text
			})),
			scaleMin: q.scaleMin,
			scaleMax: q.scaleMax,
			scaleMinLabel: q.scaleMinLabel,
			scaleMaxLabel: q.scaleMaxLabel
		}
	}

	private toAdminDto(r: AdminRow): SurveyAdminDto {
		return {
			id: r.id,
			title: r.title,
			description: r.description,
			status: r.status,
			isAnonymous: r.isAnonymous,
			opensAt: r.opensAt?.toISOString() ?? null,
			closesAt: r.closesAt?.toISOString() ?? null,
			questionCount: r.questions.length,
			completionCount: r._count.completions,
			targetGroups: r.targetGroups.map(t => ({
				groupId: t.group.id,
				groupName: t.group.name
			})),
			questions: r.questions.map(q => this.toQuestionDto(q)),
			createdAt: r.createdAt.toISOString()
		}
	}
}
