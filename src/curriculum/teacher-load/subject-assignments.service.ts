import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { LessonType, LoadDistributionMode } from '@prisma/client'
import { randomUUID } from 'crypto'
import type { Request } from 'express'

import { activeStudentWhere } from '@/libs/common/active-student'
import { PrismaService } from '@/prisma/prisma.service'

import { DiplomaSupervisionService } from './diploma-supervision.service'
import type {
	ConfirmSubjectAssignmentsDto,
	ConfirmSubjectAssignmentsResultDto,
	LessonAssignmentDto,
	RevokeSubjectAssignmentsDto,
	RevokeSubjectAssignmentsResultDto,
	SetDistributionModeDto,
	SubjectAssignmentDto,
	TeacherRefDto,
	UpdateLessonAssignmentDto,
	UpdateSubjectAssignmentDto
} from './dto/subject-assignment.dto'
import {
	MIN_PRACTICE_SUBGROUP_SIZE,
	MIN_SUBGROUP_SIZE,
	NORM_DIPLOMA_COMMITTEE_HOURS_PER_MEMBER,
	NORM_MAX_DIPLOMA_WORKS_PER_TEACHER,
	NORM_MAX_DISCIPLINES,
	NORM_TEACHING_HOURS_PER_RATE,
	teachingHoursLimit
} from './teacher-load.constants'
import {
	computeControlWorksCheckHours,
	computeCourseWorkSupervisionHours,
	computePracticeSupervisionHours,
	computePreControlConsultationHours,
	computeSemesterControlHours
} from './teacher-load.formulas'

// ─── Prisma includes ──────────────────────────────────────────────────────────

/** Поля викладача, необхідні для TeacherRefDto */
const TEACHER_SELECT = {
	id: true,
	lastName: true,
	firstName: true,
	middleName: true,
	positionName: true,
	universityFacultyChairShortName: true,
	universityFacultyChairFullName: true,
	rate: true
} satisfies Prisma.TeacherSelect

const SUBJECT_INCLUDE = {
	primaryTeacher: { select: TEACHER_SELECT },
	group: { select: { id: true, name: true } },
	curriculumComponentTerm: {
		include: {
			component: {
				select: {
					id: true,
					code: true,
					name: true,
					section: { select: { orderIndex: true } },
					orderIndex: true
				}
			}
		}
	},
	lessonAssignments: {
		include: { overrideTeacher: { select: TEACHER_SELECT } },
		orderBy: [
			{ lessonType: 'asc' as const },
			{ subgroupNumber: 'asc' as const }
		]
	}
} satisfies Prisma.TeacherLoadSubjectAssignmentInclude

type SubjectRow = Prisma.TeacherLoadSubjectAssignmentGetPayload<{
	include: typeof SUBJECT_INCLUDE
}>

type TeacherSelectResult = Prisma.TeacherGetPayload<{
	select: typeof TEACHER_SELECT
}>

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SubjectAssignmentsService {
	private readonly logger = new Logger(SubjectAssignmentsService.name)

	public constructor(
		private readonly prisma: PrismaService,
		private readonly diplomaSupervisionService: DiplomaSupervisionService
	) {}

	// ── Public API ─────────────────────────────────────────────────────────────

	/**
	 * Генерує DRAFT subject assignments із бюджету годин робочого плану.
	 *
	 * Правила розподілу:
	 *  - LECTURE → stream subject (groupId = null) + один LECTURE lesson row
	 *  - PRACTICE / LAB / SEMINAR / CONSULTATION / SPRS →
	 *      stream subject (groupId = null);
	 *      PRACTICE / LAB при subgroupCount >= 2 → окремий lesson row на кожну підгрупу
	 *
	 * Якщо DRAFT-записи вже існують — вони перегенеровуються.
	 * primaryTeacher і overrideTeacher зберігаються.
	 * CONFIRMED-записи ніколи не чіпаються.
	 */
	public async generate(
		workingCurriculumId: string,
		userId: string
	): Promise<SubjectAssignmentDto[]> {
		this.logger.log(
			`Generating subject assignments for WC id=${workingCurriculumId}`
		)

		const wc = await this.prisma.workingCurriculum.findUnique({
			where: { id: workingCurriculumId },
			include: {
				componentTerms: {
					include: {
						componentTerm: {
							select: {
								id: true,
								subgroupCount: true,
								controlForm: true,
								hasCourseWork: true,
								hasCourseProject: true,
								component: {
									select: {
										componentType: true,
										practiceType: true,
										section: {
											select: { sectionType: true }
										}
									}
								}
							}
						}
					},
					orderBy: [
						{
							componentTerm: {
								component: { section: { orderIndex: 'asc' } }
							}
						},
						{ componentTerm: { component: { orderIndex: 'asc' } } },
						{ componentTerm: { semesterNumber: 'asc' } }
					]
				}
			}
		})
		if (!wc)
			throw new NotFoundException('Робочий навчальний план не знайдено.')

		const activeGroups =
			await this.prisma.groupCurriculumAssignment.findMany({
				where: { versionId: wc.versionId, isActive: true },
				select: { groupId: true }
			})
		const groupIds = activeGroups.map(g => g.groupId)

		// Кількість студентів по кожній групі — для заліків/екзаменів/контрольних (п.11/12/14/16),
		// де норма визначається на студента, а не на групу як ціле.
		const studentCounts =
			groupIds.length > 0
				? await this.prisma.student.groupBy({
						by: ['groupId'],
						where: {
							groupId: { in: groupIds },
							...activeStudentWhere()
						},
						_count: { id: true }
					})
				: []
		const studentCountByGroup = new Map(
			studentCounts.map(s => [s.groupId, s._count.id])
		)

		// Зберігаємо призначення з існуючих DRAFT
		const existingSubjects =
			await this.prisma.teacherLoadSubjectAssignment.findMany({
				where: { workingCurriculumId, status: 'DRAFT' },
				include: {
					lessonAssignments: {
						select: {
							lessonType: true,
							subgroupNumber: true,
							overrideTeacherId: true
						}
					}
				}
			})

		// savedPrimary: "${termId}:${groupId ?? 'stream'}" → primaryTeacherId
		const savedPrimary = new Map<string, string | null>()
		// savedOverride: "${termId}:${groupId ?? 'stream'}:${lessonType}:${subgroup}" → overrideTeacherId
		const savedOverride = new Map<string, string | null>()

		for (const sa of existingSubjects) {
			const sk = `${sa.curriculumComponentTermId}:${sa.groupId ?? 'stream'}`
			savedPrimary.set(sk, sa.primaryTeacherId)
			for (const la of sa.lessonAssignments) {
				if (la.overrideTeacherId !== null) {
					// ключ включає subgroupNumber щоб різнити підгрупи
					savedOverride.set(
						`${sk}:${la.lessonType}:${la.subgroupNumber ?? 'null'}`,
						la.overrideTeacherId
					)
				}
			}
		}

		// Будуємо нові рядки
		type SubjectInput = Prisma.TeacherLoadSubjectAssignmentCreateManyInput
		type LessonInput = Prisma.TeacherLoadLessonAssignmentCreateManyInput

		const subjectRows: SubjectInput[] = []
		const lessonRows: LessonInput[] = []

		// Додає lesson-рядки для типу заняття; PRACTICE/LAB з subgroupCount >= 2
		// розбиваються на підгрупи (окремий рядок на кожну) для різних викладачів.
		const pushLessons = (
			saId: string,
			sk: string,
			type: LessonType,
			hours: number,
			subgroupCount: number
		): void => {
			// Поділ на підгрупи охоплює ВСІ види занять: кожна підгрупа ведеться
			// окремо (свій викладач, повні години). Тип заняття не обмежує поділ.
			const canSplit = subgroupCount >= 2
			if (canSplit) {
				for (let sg = 1; sg <= subgroupCount; sg++) {
					lessonRows.push({
						id: randomUUID(),
						subjectAssignmentId: saId,
						lessonType: type,
						subgroupNumber: sg,
						hours,
						overrideTeacherId:
							savedOverride.get(`${sk}:${type}:${sg}`) ?? null
					})
				}
			} else {
				lessonRows.push({
					id: randomUUID(),
					subjectAssignmentId: saId,
					lessonType: type,
					subgroupNumber: null,
					hours,
					overrideTeacherId:
						savedOverride.get(`${sk}:${type}:null`) ?? null
				})
			}
		}

		for (const wct of wc.componentTerms) {
			const termId = wct.componentTermId
			const year = wc.academicYear
			const subgroupCount =
				wct.subgroupCount ?? wct.componentTerm.subgroupCount ?? 1

			// ── Потоковий subject: лекції ────────────────────────────────────────────
			if (wct.lectureHours > 0) {
				const sk = `${termId}:stream`
				const saId = randomUUID()
				subjectRows.push({
					id: saId,
					workingCurriculumId,
					curriculumComponentTermId: termId,
					groupId: null,
					academicYear: year,
					primaryTeacherId: savedPrimary.get(sk) ?? null,
					assignedById: userId,
					status: 'DRAFT'
				})
				pushLessons(
					saId,
					sk,
					'LECTURE',
					wct.lectureHours,
					subgroupCount
				)
			}

			// ── Потоковий subject: не-лекційні потокові типи ──────────────────────────
			// Семінари/консультації/СПРС — завжди потік. Практики/лаб — лише якщо їх
			// режим STREAM. PER_GROUP-практики/лаб ідуть нижче окремими subject'ами.
			const streamTypes: Array<[LessonType, number]> = [
				['SEMINAR', wct.seminarHours],
				['CONSULTATION', wct.consultationHours],
				['SPRS', wct.independentHours]
			]
			if (wct.practiceMode === 'STREAM')
				streamTypes.push(['PRACTICE', wct.practicalHours])
			if (wct.labMode === 'STREAM')
				streamTypes.push(['LAB', wct.labHours])
			const activeStreamTypes = streamTypes.filter(([, h]) => h > 0)

			if (activeStreamTypes.length > 0) {
				const sk = `${termId}:stream`
				const saId = randomUUID()
				subjectRows.push({
					id: saId,
					workingCurriculumId,
					curriculumComponentTermId: termId,
					groupId: null,
					academicYear: year,
					primaryTeacherId: savedPrimary.get(sk) ?? null,
					assignedById: userId,
					status: 'DRAFT'
				})
				for (const [type, hours] of activeStreamTypes) {
					pushLessons(saId, sk, type, hours, subgroupCount)
				}
			}

			// ── Per-group subjects: практики/лаб у режимі PER_GROUP ───────────────────
			// Окремий subject на кожну активну групу — щоб призначати різних викладачів.
			const perGroupTypes: Array<[LessonType, number]> = []
			if (wct.practiceMode === 'PER_GROUP' && wct.practicalHours > 0) {
				perGroupTypes.push(['PRACTICE', wct.practicalHours])
			}
			if (wct.labMode === 'PER_GROUP' && wct.labHours > 0) {
				perGroupTypes.push(['LAB', wct.labHours])
			}

			if (perGroupTypes.length > 0) {
				for (const gid of groupIds) {
					const sk = `${termId}:${gid}`
					const saId = randomUUID()
					subjectRows.push({
						id: saId,
						workingCurriculumId,
						curriculumComponentTermId: termId,
						groupId: gid,
						academicYear: year,
						primaryTeacherId: savedPrimary.get(sk) ?? null,
						assignedById: userId,
						status: 'DRAFT'
					})
					for (const [type, hours] of perGroupTypes) {
						pushLessons(saId, sk, type, hours, subgroupCount)
					}
				}
			}

			// ── Per-group subjects: заліки/екзамени/контрольні (п.11/12/14/16) ────────
			// Завжди по групах (кожна група проходить контроль окремо), без поділу на
			// підгрупи. Округлюємо до цілої години — LessonAssignment.hours є Int,
			// дробові норми Наказу №686 (0.25/0.33/0.5) округлюються для облікового наказу.
			for (const gid of groupIds) {
				const studentCount = studentCountByGroup.get(gid) ?? 0
				const semesterControlHours = Math.round(
					computeSemesterControlHours(
						wct.componentTerm.controlForm,
						wct.examFormat,
						1,
						studentCount
					)
				)
				const controlWorksHours = Math.round(
					computeControlWorksCheckHours(
						wct.controlWorksAuditoryCount,
						wct.controlWorksIndependentCount,
						studentCount
					)
				)
				const preControlConsultationHours = Math.round(
					computePreControlConsultationHours(
						wct.componentTerm.controlForm,
						1
					)
				)

				if (
					semesterControlHours === 0 &&
					controlWorksHours === 0 &&
					preControlConsultationHours === 0
				)
					continue

				const sk = `${termId}:${gid}`
				const saId = randomUUID()
				subjectRows.push({
					id: saId,
					workingCurriculumId,
					curriculumComponentTermId: termId,
					groupId: gid,
					academicYear: year,
					primaryTeacherId: savedPrimary.get(sk) ?? null,
					assignedById: userId,
					status: 'DRAFT'
				})
				if (semesterControlHours > 0) {
					lessonRows.push({
						id: randomUUID(),
						subjectAssignmentId: saId,
						lessonType: 'SEMESTER_CONTROL',
						subgroupNumber: null,
						hours: semesterControlHours,
						overrideTeacherId:
							savedOverride.get(`${sk}:SEMESTER_CONTROL:null`) ??
							null
					})
				}
				if (controlWorksHours > 0) {
					lessonRows.push({
						id: randomUUID(),
						subjectAssignmentId: saId,
						lessonType: 'CONTROL_WORKS_CHECK',
						subgroupNumber: null,
						hours: controlWorksHours,
						overrideTeacherId:
							savedOverride.get(
								`${sk}:CONTROL_WORKS_CHECK:null`
							) ?? null
					})
				}
				if (preControlConsultationHours > 0) {
					lessonRows.push({
						id: randomUUID(),
						subjectAssignmentId: saId,
						lessonType: 'PRE_CONTROL_CONSULTATION',
						subgroupNumber: null,
						hours: preControlConsultationHours,
						overrideTeacherId:
							savedOverride.get(
								`${sk}:PRE_CONTROL_CONSULTATION:null`
							) ?? null
					})
				}
			}

			// ── Per-group subjects: керівництво практикою (п.17/18) ───────────────────
			// Завжди по групах, з підтримкою поділу на підгрупи (18 год/тижд на кожну
			// підгрупу для навчальної практики — pushLessons() розбиває автоматично).
			const { componentType, practiceType } = wct.componentTerm.component
			if (componentType === 'PRACTICE') {
				for (const gid of groupIds) {
					const studentCount = studentCountByGroup.get(gid) ?? 0
					const practiceHours = Math.round(
						computePracticeSupervisionHours(
							componentType,
							practiceType,
							wct.practiceDurationWeeks?.toNumber() ?? null,
							studentCount
						)
					)
					if (practiceHours === 0) continue

					const sk = `${termId}:${gid}`
					const saId = randomUUID()
					subjectRows.push({
						id: saId,
						workingCurriculumId,
						curriculumComponentTermId: termId,
						groupId: gid,
						academicYear: year,
						primaryTeacherId: savedPrimary.get(sk) ?? null,
						assignedById: userId,
						status: 'DRAFT'
					})
					pushLessons(
						saId,
						sk,
						'PRACTICE_SUPERVISION',
						practiceHours,
						subgroupCount
					)
				}
			}

			// ── Per-group subjects: керівництво курсовими роботами/проєктами (п.13) ──
			// На студента, без поділу на підгрупи — курсовою керує один викладач
			// незалежно від того, чи ділиться група на практичні підгрупи.
			const { hasCourseWork, hasCourseProject } = wct.componentTerm
			if (hasCourseWork || hasCourseProject) {
				for (const gid of groupIds) {
					const studentCount = studentCountByGroup.get(gid) ?? 0
					const courseWorkHours = Math.round(
						computeCourseWorkSupervisionHours(
							hasCourseWork,
							hasCourseProject,
							wct.componentTerm.component.section.sectionType,
							studentCount
						)
					)
					if (courseWorkHours === 0) continue

					const sk = `${termId}:${gid}`
					const saId = randomUUID()
					subjectRows.push({
						id: saId,
						workingCurriculumId,
						curriculumComponentTermId: termId,
						groupId: gid,
						academicYear: year,
						primaryTeacherId: savedPrimary.get(sk) ?? null,
						assignedById: userId,
						status: 'DRAFT'
					})
					lessonRows.push({
						id: randomUUID(),
						subjectAssignmentId: saId,
						lessonType: 'COURSE_WORK_SUPERVISION',
						subgroupNumber: null,
						hours: courseWorkHours,
						overrideTeacherId:
							savedOverride.get(
								`${sk}:COURSE_WORK_SUPERVISION:null`
							) ?? null
					})
				}
			}

			// ── Per-group subjects: комісія захисту дипломних робіт (п.20) ────────────
			// Seat-based через pushLessons() — кожне "місце" комісії незалежно
			// призначається через існуючий UI (LessonTeacherSelectCell). Персональне
			// керівництво дипломом сюди НЕ входить — воно живе в DiplomaSupervisionAssignment,
			// поза цим DRAFT/CONFIRMED workflow.
			if (
				componentType === 'DIPLOMA_PROJECT' ||
				componentType === 'QUALIFICATION_WORK_DEFENSE'
			) {
				for (const gid of groupIds) {
					const studentCount = studentCountByGroup.get(gid) ?? 0
					const committeeHours = Math.round(
						NORM_DIPLOMA_COMMITTEE_HOURS_PER_MEMBER * studentCount
					)
					if (committeeHours === 0) continue

					const sk = `${termId}:${gid}`
					const saId = randomUUID()
					subjectRows.push({
						id: saId,
						workingCurriculumId,
						curriculumComponentTermId: termId,
						groupId: gid,
						academicYear: year,
						primaryTeacherId: savedPrimary.get(sk) ?? null,
						assignedById: userId,
						status: 'DRAFT'
					})
					pushLessons(
						saId,
						sk,
						'DIPLOMA_COMMITTEE',
						committeeHours,
						wct.diplomaCommitteeSize
					)
				}
			}
		}

		// Транзакція: видаляємо DRAFT, вставляємо нові записи.
		// Явний таймаут: deleteMany + 2×createMany для великих планів (реально 100–300 термів,
		// теоретична межа ~5000) може перевищити дефолтні 5с інтерактивної транзакції Prisma.
		await this.prisma.$transaction(
			async tx => {
				await tx.teacherLoadSubjectAssignment.deleteMany({
					where: { workingCurriculumId, status: 'DRAFT' }
				})
				await tx.teacherLoadSubjectAssignment.createMany({
					data: subjectRows
				})
				await tx.teacherLoadLessonAssignment.createMany({
					data: lessonRows
				})
			},
			{ timeout: 30_000, maxWait: 10_000 }
		)

		this.logger.log(
			`Generated ${subjectRows.length} subject + ${lessonRows.length} lesson rows for WC id=${workingCurriculumId}`
		)
		return this.findAll(workingCurriculumId)
	}

	/** Повертає всі subject assignments для робочого плану в документному порядку. */
	public async findAll(
		workingCurriculumId: string
	): Promise<SubjectAssignmentDto[]> {
		const rows = await this.prisma.teacherLoadSubjectAssignment.findMany({
			where: { workingCurriculumId },
			include: SUBJECT_INCLUDE,
			orderBy: [
				{
					curriculumComponentTerm: {
						component: { section: { orderIndex: 'asc' } }
					}
				},
				{
					curriculumComponentTerm: {
						component: { orderIndex: 'asc' }
					}
				},
				{ curriculumComponentTerm: { semesterNumber: 'asc' } },
				{ group: { name: 'asc' } }
			]
		})

		// Режими розподілу по ОК-семестрах робочого плану.
		const modeRows =
			await this.prisma.workingCurriculumComponentTerm.findMany({
				where: { workingCurriculumId },
				select: {
					componentTermId: true,
					practiceMode: true,
					labMode: true,
					subgroupCount: true
				}
			})
		const modes = new Map(
			modeRows.map(m => [
				m.componentTermId,
				{
					practiceMode: m.practiceMode,
					labMode: m.labMode,
					subgroupCount: m.subgroupCount
				}
			])
		)

		return rows.map(r =>
			this.mapSubjectToDto(r, [], modes.get(r.curriculumComponentTermId))
		)
	}

	/**
	 * Оновлює primaryTeacherId на рівні subject assignment.
	 *
	 * Lesson overrides не змінюються — effectiveTeacher для кожного lesson
	 * перераховується автоматично (overrideTeacherId ?? новий primaryTeacherId).
	 */
	public async updateSubject(
		id: string,
		dto: UpdateSubjectAssignmentDto,
		userId: string
	): Promise<SubjectAssignmentDto> {
		const existing =
			await this.prisma.teacherLoadSubjectAssignment.findUnique({
				where: { id },
				select: { id: true, status: true }
			})
		if (!existing)
			throw new NotFoundException('Subject assignment не знайдено.')
		if (existing.status === 'CONFIRMED') {
			throw new BadRequestException(
				'Підтверджені записи не можна редагувати.'
			)
		}

		const updated = await this.prisma.teacherLoadSubjectAssignment.update({
			where: { id },
			data: {
				...(dto.primaryTeacherId !== undefined && {
					primaryTeacherId: dto.primaryTeacherId
				}),
				assignedById: userId
			},
			include: SUBJECT_INCLUDE
		})

		const modeRow =
			await this.prisma.workingCurriculumComponentTerm.findUnique({
				where: {
					workingCurriculumId_componentTermId: {
						workingCurriculumId: updated.workingCurriculumId,
						componentTermId: updated.curriculumComponentTermId
					}
				},
				select: {
					practiceMode: true,
					labMode: true,
					subgroupCount: true
				}
			})

		return this.mapSubjectToDto(updated, [], modeRow ?? undefined)
	}

	/**
	 * Оновлює overrideTeacherId для конкретного виду заняття.
	 *
	 * Правило: якщо overrideTeacherId == primaryTeacherId батьківського subject —
	 * override очищається до null (override на того самого викладача безглуздий).
	 *
	 * [HARD BLOCK] subgroupNumber ≠ null для LECTURE/SEMINAR/CONSULTATION/SPRS.
	 * [SOFT WARN]  Менше 10 студентів у підгрупі (практ./лаб.).
	 */
	public async updateLesson(
		id: string,
		dto: UpdateLessonAssignmentDto,
		userId: string
	): Promise<LessonAssignmentDto> {
		const lesson = await this.prisma.teacherLoadLessonAssignment.findUnique(
			{
				where: { id },
				include: {
					subjectAssignment: {
						select: {
							status: true,
							primaryTeacherId: true,
							groupId: true,
							curriculumComponentTerm: {
								select: { subgroupCount: true }
							}
						}
					}
				}
			}
		)
		if (!lesson)
			throw new NotFoundException('Lesson assignment не знайдено.')
		if (lesson.subjectAssignment.status === 'CONFIRMED') {
			throw new BadRequestException(
				'Підтверджені записи не можна редагувати.'
			)
		}

		// При поділі дисципліни на підгрупи кожна підгрупа ведеться окремо в УСІХ
		// видах занять (своя викладач), тому обмеження типу тут немає.
		const newSubgroup =
			dto.subgroupNumber !== undefined
				? dto.subgroupNumber
				: lesson.subgroupNumber

		// Якщо override == primary → очищаємо override до null (зайва надмірність)
		let resolvedOverrideId =
			dto.overrideTeacherId !== undefined
				? dto.overrideTeacherId
				: lesson.overrideTeacherId

		if (
			resolvedOverrideId !== null &&
			resolvedOverrideId === lesson.subjectAssignment.primaryTeacherId
		) {
			resolvedOverrideId = null
		}

		const updated = await this.prisma.teacherLoadLessonAssignment.update({
			where: { id },
			data: {
				...(dto.overrideTeacherId !== undefined && {
					overrideTeacherId: resolvedOverrideId
				}),
				...(dto.subgroupNumber !== undefined && {
					subgroupNumber: dto.subgroupNumber
				})
			},
			include: { overrideTeacher: { select: TEACHER_SELECT } }
		})

		// R3: [SOFT WARN] мінімум студентів у підгрупі
		const warnings: string[] = []
		if (newSubgroup !== null && lesson.subjectAssignment.groupId !== null) {
			const studentCount = await this.prisma.student.count({
				where: { groupId: lesson.subjectAssignment.groupId }
			})
			const subgroupCount =
				lesson.subjectAssignment.curriculumComponentTerm.subgroupCount
			const perSubgroup =
				subgroupCount > 0
					? Math.floor(studentCount / subgroupCount)
					: studentCount
			const isPractice = lesson.lessonType === 'PRACTICE_SUPERVISION'
			const minSize = isPractice
				? MIN_PRACTICE_SUBGROUP_SIZE
				: MIN_SUBGROUP_SIZE
			const normRef = isPractice ? 'п.17' : 'п.5'
			if (perSubgroup < minSize) {
				warnings.push(
					`У підгрупі ≈${perSubgroup} студентів — менше мінімуму ${minSize} осіб ` +
						`(Наказ МОН №686 ${normRef}). Поділ допустимий лише за наявності педагогічного обґрунтування.`
				)
			}
		}

		// Для effectiveTeacher потрібен primaryTeacher батьківського subject
		const primaryTeacher =
			lesson.subjectAssignment.primaryTeacherId !== null
				? await this.prisma.teacher.findUnique({
						where: {
							id: lesson.subjectAssignment.primaryTeacherId
						},
						select: TEACHER_SELECT
					})
				: null

		return this.mapLessonToDto(updated, primaryTeacher, warnings)
	}

	/**
	 * Підтверджує наказом усі DRAFT subject assignments для заданого WC.
	 *
	 * [HARD BLOCK] Перевищення 720 × rate год/рік для effectiveTeacher будь-якого lesson.
	 * [SOFT WARN]  Дата наказу після 01.09 навчального року.
	 * [SOFT WARN]  Підтвердження адміністратором (не директором).
	 * [SOFT WARN]  Відсутнє погодження профспілки.
	 */
	public async confirm(
		dto: ConfirmSubjectAssignmentsDto,
		userId: string
	): Promise<ConfirmSubjectAssignmentsResultDto> {
		const { workingCurriculumId, orderNumber, orderDate } = dto

		const wc = await this.prisma.workingCurriculum.findUnique({
			where: { id: workingCurriculumId },
			select: { id: true, academicYear: true, tradeUnionApprovedAt: true }
		})
		if (!wc)
			throw new NotFoundException('Робочий навчальний план не знайдено.')

		const draftCount = await this.prisma.teacherLoadSubjectAssignment.count(
			{
				where: { workingCurriculumId, status: 'DRAFT' }
			}
		)
		if (draftCount === 0) {
			throw new BadRequestException(
				'Немає DRAFT-записів для підтвердження. Спочатку згенеруйте розподіл.'
			)
		}

		const warnings: string[] = []

		// C6 [SOFT WARN]: підтвердження адміністратором (не залежить від знімка БД)
		const confirmingUser = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { role: true }
		})
		if (confirmingUser?.role === 'ADMINISTRATOR') {
			warnings.push(
				'Наказ підтверджено адміністратором системи. ' +
					'Юридично наказ підписує директор (Ст. 60 Закону №2745-VIII).'
			)
		}

		// R1 [SOFT WARN]: дата наказу після 01.09
		const [yearStart] = wc.academicYear.split('-')
		if (yearStart !== undefined) {
			const sept1 = new Date(`${yearStart}-09-01`)
			if (new Date(orderDate) > sept1) {
				warnings.push(
					`Дата наказу (${new Date(orderDate).toLocaleDateString('uk-UA')}) ` +
						`пізніше 01.09.${yearStart}. ` +
						`Рекомендовано затверджувати навантаження до початку навчального року.`
				)
			}
		}

		// J1 [SOFT WARN]: погодження профспілки
		if (wc.tradeUnionApprovedAt === null) {
			warnings.push(
				'Не зафіксовано погодження профспілкового комітету. ' +
					'Наказ може бути оскаржений (Ст. 60 п.5 Закону №2745-VIII).'
			)
		}

		// Жорсткі перевірки (C0/C1), запис і синхронізація teacherId — в одній серіалізованій
		// транзакції. Serializable закриває check-to-write вікно: якщо між перевіркою ліміту
		// 720×rate і записом хтось конкурентно змінить навантаження цього року — одна з
		// транзакцій відхиляється (P2034 → 409), наказ не підтвердиться з порушенням.
		let confirmedCount: number
		try {
			confirmedCount = await this.prisma.$transaction(
				async tx => {
					// C0 [HARD BLOCK]: усі DRAFT мають призначеного основного викладача
					const unassignedCount =
						await tx.teacherLoadSubjectAssignment.count({
							where: {
								workingCurriculumId,
								status: 'DRAFT',
								primaryTeacherId: null
							}
						})
					if (unassignedCount > 0) {
						throw new BadRequestException(
							`Неможливо підтвердити наказ: ${unassignedCount} освітніх компонентів не мають призначеного викладача.`
						)
					}

					// C1 [HARD BLOCK]: ліміт 720 × rate по effectiveTeacher (за весь рік)
					await this.assertTeacherHoursWithinLimit(
						wc.academicYear,
						tx
					)

					// Записи, що підтверджуються — для D1 (перелік викладачів) і синхронізації teacherId
					const drafts =
						await tx.teacherLoadSubjectAssignment.findMany({
							where: {
								workingCurriculumId,
								status: 'DRAFT',
								primaryTeacherId: { not: null }
							},
							select: {
								primaryTeacherId: true,
								curriculumComponentTermId: true
							}
						})

					// D1 [SOFT WARN]: кількість різних дисциплін викладача ЗА ВЕСЬ РІК (симетрично з C1/D2)
					const wcTeacherIds = [
						...new Set(
							drafts
								.map(d => d.primaryTeacherId)
								.filter((id): id is string => id !== null)
						)
					]
					if (wcTeacherIds.length > 0) {
						const yearAssignments =
							await tx.teacherLoadSubjectAssignment.findMany({
								where: {
									academicYear: wc.academicYear,
									primaryTeacherId: { in: wcTeacherIds }
								},
								select: {
									primaryTeacherId: true,
									curriculumComponentTerm: {
										select: {
											component: { select: { id: true } }
										}
									},
									primaryTeacher: {
										select: {
											lastName: true,
											firstName: true
										}
									}
								}
							})
						const disciplinesByTeacher = new Map<
							string,
							Set<string>
						>()
						const nameByTeacher = new Map<string, string>()
						for (const sa of yearAssignments) {
							if (sa.primaryTeacherId === null) continue
							if (
								!disciplinesByTeacher.has(sa.primaryTeacherId)
							) {
								disciplinesByTeacher.set(
									sa.primaryTeacherId,
									new Set()
								)
							}
							disciplinesByTeacher
								.get(sa.primaryTeacherId)!
								.add(sa.curriculumComponentTerm.component.id)
							if (sa.primaryTeacher) {
								nameByTeacher.set(
									sa.primaryTeacherId,
									`${sa.primaryTeacher.lastName} ${sa.primaryTeacher.firstName}`
								)
							}
						}
						for (const [tid, disciplines] of disciplinesByTeacher) {
							if (disciplines.size > NORM_MAX_DISCIPLINES) {
								warnings.push(
									`Викладач ${nameByTeacher.get(tid) ?? tid} веде ${disciplines.size} дисциплін ` +
										`(рекомендований максимум — ${NORM_MAX_DISCIPLINES}, Наказ МОН №686).`
								)
							}
						}
					}

					// D2 [SOFT WARN]: керівник веде більше NORM_MAX_DIPLOMA_WORKS_PER_TEACHER дипломних
					const supervisorCounts =
						await tx.diplomaSupervisionAssignment.groupBy({
							by: ['teacherId'],
							where: {
								academicYear: wc.academicYear,
								role: 'SUPERVISOR'
							},
							_count: { id: true }
						})
					for (const { teacherId, _count } of supervisorCounts) {
						if (_count.id <= NORM_MAX_DIPLOMA_WORKS_PER_TEACHER)
							continue
						const teacher = await tx.teacher.findUnique({
							where: { id: teacherId },
							select: { lastName: true, firstName: true }
						})
						const name = teacher
							? `${teacher.lastName} ${teacher.firstName}`
							: teacherId
						warnings.push(
							`Керівник ${name} веде ${_count.id} дипломних робіт (рекомендований максимум — ` +
								`${NORM_MAX_DIPLOMA_WORKS_PER_TEACHER}, Наказ МОН №686 п.20).`
						)
					}

					// Запис: DRAFT → CONFIRMED
					const updateResult =
						await tx.teacherLoadSubjectAssignment.updateMany({
							where: { workingCurriculumId, status: 'DRAFT' },
							data: {
								status: 'CONFIRMED',
								orderNumber,
								orderDate: new Date(orderDate),
								signedByDirectorId: userId
							}
						})

					// Синхронізація wct.teacherId ← primaryTeacherId (джерело правди = наказ).
					// Один componentTerm може мати кілька subject-рядків (per-group); оновлюємо лише
					// коли викладач однозначний — інакше single-field wct.teacherId не може виразити split.
					const teachersByTerm = new Map<string, Set<string>>()
					for (const d of drafts) {
						if (d.primaryTeacherId === null) continue
						if (!teachersByTerm.has(d.curriculumComponentTermId)) {
							teachersByTerm.set(
								d.curriculumComponentTermId,
								new Set()
							)
						}
						teachersByTerm
							.get(d.curriculumComponentTermId)!
							.add(d.primaryTeacherId)
					}
					for (const [termId, teacherSet] of teachersByTerm) {
						if (teacherSet.size !== 1) continue
						const [teacherId] = [...teacherSet]
						await tx.workingCurriculumComponentTerm.updateMany({
							where: {
								workingCurriculumId,
								componentTermId: termId
							},
							data: { teacherId }
						})
					}

					return updateResult.count
				},
				{
					isolationLevel:
						Prisma.TransactionIsolationLevel.Serializable,
					timeout: 15_000
				}
			)
		} catch (err) {
			if (
				err instanceof Prisma.PrismaClientKnownRequestError &&
				err.code === 'P2034'
			) {
				throw new ConflictException(
					'Паралельна зміна навантаження під час підтвердження. Повторіть спробу.'
				)
			}
			throw err
		}

		this.logger.log(
			`Confirmed ${confirmedCount} subject assignments for WC id=${workingCurriculumId}, order=${orderNumber}`
		)
		return { confirmed: confirmedCount, warnings }
	}

	/**
	 * Скасовує наказ: повертає всі CONFIRMED записи WC у статус DRAFT,
	 * очищає номер/дату наказу і підпис директора. Фіксує дію в AuditLog.
	 *
	 * Юридично значуща операція — лише DIRECTOR/ADMINISTRATOR (гард на контролері).
	 */
	public async revoke(
		dto: RevokeSubjectAssignmentsDto,
		userId: string,
		req: Request
	): Promise<RevokeSubjectAssignmentsResultDto> {
		const { workingCurriculumId, reason } = dto

		const wc = await this.prisma.workingCurriculum.findUnique({
			where: { id: workingCurriculumId },
			select: { id: true }
		})
		if (!wc)
			throw new NotFoundException('Робочий навчальний план не знайдено.')

		const confirmedCount =
			await this.prisma.teacherLoadSubjectAssignment.count({
				where: { workingCurriculumId, status: 'CONFIRMED' }
			})
		if (confirmedCount === 0) {
			throw new BadRequestException(
				'Немає підтверджених наказом записів для скасування.'
			)
		}

		const reverted = await this.prisma.$transaction(async tx => {
			const result = await tx.teacherLoadSubjectAssignment.updateMany({
				where: { workingCurriculumId, status: 'CONFIRMED' },
				data: {
					status: 'DRAFT',
					orderNumber: null,
					orderDate: null,
					signedByDirectorId: null
				}
			})

			await tx.auditLog.create({
				data: {
					userId,
					action: 'REVOKE_TEACHER_LOAD_ORDER',
					targetId: workingCurriculumId,
					targetType: 'WorkingCurriculum',
					ipAddress: req.ip ?? null,
					metadata: { reverted: result.count, reason: reason ?? null }
				}
			})

			return result.count
		})

		this.logger.log(
			`Revoked teacher-load order for WC id=${workingCurriculumId}: ${reverted} records → DRAFT (userId=${userId})`
		)
		return { reverted }
	}

	/**
	 * Змінює режим розподілу практик/лаб (STREAM ↔ PER_GROUP) для ОК-семестру
	 * робочого плану та перегенеровує DRAFT-призначення під новий режим.
	 *
	 * [HARD BLOCK] якщо для цього ОК у плані вже є CONFIRMED-записи.
	 */
	public async setDistributionMode(
		dto: SetDistributionModeDto,
		userId: string
	): Promise<SubjectAssignmentDto[]> {
		const {
			workingCurriculumId,
			curriculumComponentTermId,
			practiceMode,
			labMode,
			subgroupCount
		} = dto

		const wct = await this.prisma.workingCurriculumComponentTerm.findUnique(
			{
				where: {
					workingCurriculumId_componentTermId: {
						workingCurriculumId,
						componentTermId: curriculumComponentTermId
					}
				},
				select: { id: true }
			}
		)
		if (!wct)
			throw new NotFoundException('Компонент робочого плану не знайдено.')

		const confirmed = await this.prisma.teacherLoadSubjectAssignment.count({
			where: {
				workingCurriculumId,
				curriculumComponentTermId,
				status: 'CONFIRMED'
			}
		})
		if (confirmed > 0) {
			throw new BadRequestException(
				'Навантаження підтверджено наказом — змінити режим розподілу не можна. Спочатку скасуйте наказ.'
			)
		}

		await this.prisma.workingCurriculumComponentTerm.update({
			where: { id: wct.id },
			data: {
				...(practiceMode !== undefined && { practiceMode }),
				...(labMode !== undefined && { labMode }),
				...(subgroupCount !== undefined && { subgroupCount })
			}
		})

		// Перегенеровуємо DRAFT, щоб структура subject'ів відповідала новому режиму
		// (призначення викладачів зберігаються там, де ключі збігаються).
		return this.generate(workingCurriculumId, userId)
	}

	// ── Private helpers ────────────────────────────────────────────────────────

	/**
	 * C1 [HARD BLOCK]: перевіряє, що жоден effectiveTeacher не перевищує
	 * ліміт 720 × rate год/рік з урахуванням УСІХ WC за навчальний рік.
	 *
	 * effectiveTeacherId per lesson = overrideTeacherId ?? parent.primaryTeacherId
	 */
	private async assertTeacherHoursWithinLimit(
		academicYear: string,
		db: Prisma.TransactionClient = this.prisma
	): Promise<void> {
		const lessons = await db.teacherLoadLessonAssignment.findMany({
			where: { subjectAssignment: { academicYear } },
			select: {
				hours: true,
				overrideTeacherId: true,
				subjectAssignment: { select: { primaryTeacherId: true } }
			}
		})

		const hoursByTeacher = new Map<string, number>()
		for (const lesson of lessons) {
			const effectiveId =
				lesson.overrideTeacherId ??
				lesson.subjectAssignment.primaryTeacherId
			if (effectiveId === null) continue
			hoursByTeacher.set(
				effectiveId,
				(hoursByTeacher.get(effectiveId) ?? 0) + lesson.hours
			)
		}

		// Персональне керівництво дипломами (Наказ МОН №686, п.20) — окрема таблиця,
		// поза TeacherLoadLessonAssignment, але враховується в тому самому 720-годинному
		// ліміті (Ст. 60 №2745-VIII охоплює повне навчальне навантаження за рік).
		// Без явного teacherIds-фільтра — щоб не пропустити викладача, який має ЛИШЕ
		// дипломне керівництво, без жодного звичайного заняття.
		const diplomaHoursByTeacher =
			await this.diplomaSupervisionService.getTeachersDiplomaHoursByAcademicYear(
				academicYear,
				undefined,
				db
			)
		for (const [teacherId, diplomaHours] of diplomaHoursByTeacher) {
			hoursByTeacher.set(
				teacherId,
				(hoursByTeacher.get(teacherId) ?? 0) + diplomaHours
			)
		}

		if (hoursByTeacher.size === 0) return

		const teachers = await db.teacher.findMany({
			where: { id: { in: [...hoursByTeacher.keys()] } },
			select: { id: true, firstName: true, lastName: true, rate: true }
		})
		const byId = new Map(teachers.map(t => [t.id, t]))

		const exceeded: string[] = []
		for (const [tid, totalHours] of hoursByTeacher) {
			const t = byId.get(tid)
			const rate = t?.rate.toNumber() ?? 1.0
			const limit = teachingHoursLimit(rate)
			if (totalHours > limit) {
				const name = t ? `${t.lastName} ${t.firstName}` : tid
				exceeded.push(
					`${name}: ${totalHours} год` +
						` (ліміт ${limit} год = ${NORM_TEACHING_HOURS_PER_RATE} × ${rate} ставки)`
				)
			}
		}

		if (exceeded.length > 0) {
			throw new BadRequestException(
				`Перевищено ліміт навчального навантаження (Ст. 60 №2745-VIII):\n` +
					exceeded.join('\n')
			)
		}
	}

	// ── Mappers ────────────────────────────────────────────────────────────────

	private mapSubjectToDto(
		row: SubjectRow,
		warnings: string[],
		modes?: {
			practiceMode: LoadDistributionMode
			labMode: LoadDistributionMode
			subgroupCount: number
		}
	): SubjectAssignmentDto {
		const ct = row.curriculumComponentTerm
		const primaryTeacher =
			row.primaryTeacher !== null
				? this.mapTeacherRef(row.primaryTeacher)
				: null

		const lessons = row.lessonAssignments.map(la =>
			this.mapLessonToDto(la, row.primaryTeacher, [])
		)

		return {
			id: row.id,
			workingCurriculumId: row.workingCurriculumId,
			curriculumComponentTermId: row.curriculumComponentTermId,
			componentId: ct.component.id,
			componentCode: ct.component.code,
			componentName: ct.component.name,
			semesterNumber: ct.semesterNumber,
			groupId: row.groupId,
			groupName: row.group?.name ?? null,
			academicYear: row.academicYear,
			primaryTeacher,
			status: row.status,
			orderNumber: row.orderNumber,
			orderDate: row.orderDate?.toISOString() ?? null,
			assignedById: row.assignedById,
			signedByDirectorId: row.signedByDirectorId,
			practiceMode: modes?.practiceMode ?? 'STREAM',
			labMode: modes?.labMode ?? 'STREAM',
			subgroupCount: modes?.subgroupCount ?? 1,
			totalHours: lessons.reduce((s, l) => s + l.hours, 0),
			lessons,
			warnings,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString()
		}
	}

	private mapLessonToDto(
		la: {
			id: string
			lessonType: LessonType
			subgroupNumber: number | null
			hours: number
			overrideTeacher: TeacherSelectResult | null
			createdAt: Date
			updatedAt: Date
		},
		primaryTeacher: TeacherSelectResult | null,
		warnings: string[]
	): LessonAssignmentDto {
		const overrideTeacher =
			la.overrideTeacher !== null
				? this.mapTeacherRef(la.overrideTeacher)
				: null

		const effectiveRaw = la.overrideTeacher ?? primaryTeacher
		const effectiveTeacher =
			effectiveRaw !== null ? this.mapTeacherRef(effectiveRaw) : null

		return {
			id: la.id,
			lessonType: la.lessonType,
			subgroupNumber: la.subgroupNumber,
			hours: la.hours,
			overrideTeacher,
			effectiveTeacher,
			createdAt: la.createdAt.toISOString(),
			updatedAt: la.updatedAt.toISOString(),
			// warnings attached at call site
			...(warnings.length > 0 && { warnings })
		}
	}

	private mapTeacherRef(t: TeacherSelectResult): TeacherRefDto {
		return {
			id: t.id,
			lastName: t.lastName,
			firstName: t.firstName,
			middleName: t.middleName,
			fullName: `${t.lastName} ${t.firstName}${t.middleName ? ` ${t.middleName}` : ''}`,
			positionName: t.positionName,
			departmentName:
				t.universityFacultyChairShortName ??
				t.universityFacultyChairFullName ??
				null,
			rate: t.rate.toNumber()
		}
	}
}
