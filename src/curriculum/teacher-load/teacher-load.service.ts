import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type {
	ComponentType,
	CurriculumSectionType,
	ExamFormat,
	LoadDistributionMode,
	PracticeType,
	TermControlForm
} from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { DiplomaSupervisionService } from './diploma-supervision.service'
import type {
	AllTeachersLoadDto,
	HoursPerGroupDto,
	LoadComponentDto,
	MyTeacherLoadDto,
	TeacherLoadDto,
	TeacherLoadEntryDto,
	TeacherLoadSummaryDto,
	TeacherSummaryDto,
	TotalHoursDto
} from './dto/teacher-load.dto'
import {
	NORM_DIPLOMA_COMMITTEE_HOURS_PER_MEMBER,
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

// ─── Internal types ───────────────────────────────────────────────────────────

/** Плоский рядок, що описує один компонент-семестр для зведення навантаження. */
interface LoadRow {
	teacherId: string | null
	teacher: {
		id: string
		firstName: string
		lastName: string
		middleName: string | null
		skillName: string | null
		positionName: string | null
		departmentName: string | null
		/** Ставка (0.25–1.5), з @default(1.0) завжди присутня */
		rate: number
	} | null
	componentId: string
	componentCode: string | null
	componentName: string
	semesterNumber: number
	groupCount: number
	studentCount: number
	lecture: number
	practical: number
	lab: number
	seminar: number
	independent: number
	examPrep: number
	/** Режим розподілу практик/лаб (визначає множник годин). */
	practiceMode: LoadDistributionMode
	labMode: LoadDistributionMode
	/** Кількість підгруп (≥2 → години діляться/множаться). */
	subgroupCount: number
	/** Форма підсумкового контролю (для розрахунку заліку/екзамену, п.14/16). */
	controlForm: TermControlForm | null
	/** Формат екзамену — усно/письмово (п.16). */
	examFormat: ExamFormat | null
	/** Кількість контрольних робіт: аудиторних (п.11) / самостійних (п.12). */
	controlWorksAuditoryCount: number
	controlWorksIndependentCount: number
	/** Тип освітнього компонента (для розрахунку керівництва практикою, п.17/18). */
	componentType: ComponentType
	/** Вид практики (лише для componentType=PRACTICE). */
	practiceType: PracticeType | null
	/** Тривалість практики в тижнях (лише для componentType=PRACTICE). */
	practiceDurationWeeks: number | null
	/** Чи має термін курсову роботу/проєкт (п.13). */
	hasCourseWork: boolean
	hasCourseProject: boolean
	/** Тип секції плану (для ставки курсового проєкту: загальнотехн./фахова, п.13). */
	sectionType: CurriculumSectionType
	/** Кількість членів комісії захисту дипломних робіт (п.20, лише DIPLOMA_PROJECT/QUALIFICATION_WORK_DEFENSE). */
	diplomaCommitteeSize: number
}

@Injectable()
export class TeacherLoadService {
	private readonly logger = new Logger(TeacherLoadService.name)

	public constructor(
		private readonly prisma: PrismaService,
		private readonly diplomaSupervisionService: DiplomaSupervisionService
	) {}

	// ── Public API ─────────────────────────────────────────────────────────────

	/**
	 * Генерує педагогічне навантаження для заданого робочого навчального плану.
	 *
	 * Алгоритм:
	 *   1. Завантажує WC → компонент-семестри (з викладачами і компонентами), зберігає порядок.
	 *   2. Завантажує активні групи версії та кількість студентів кожної.
	 *   3. Для кожного компонент-семестру будує LoadRow з урахуванням правил множення:
	 *        лекції × 1 (потоковий), решта × groupCount.
	 *   4. Групує по teacherId (null = без призначення).
	 *   5. Рахує нормативні сигнали (не блокуючі).
	 */
	public async generateByWorkingCurriculum(
		id: string
	): Promise<TeacherLoadDto> {
		this.logger.debug(`Generating teacher load for WC id=${id}`)

		const wc = await this.prisma.workingCurriculum.findUnique({
			where: { id },
			include: {
				version: {
					select: {
						id: true,
						curriculum: {
							select: {
								educationForm: true,
								entryYear: true,
								program: {
									select: {
										name: true,
										specialty: {
											select: { code: true, name: true }
										}
									}
								}
							}
						}
					}
				},
				componentTerms: {
					include: {
						teacher: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								middleName: true,
								skillName: true,
								positionName: true,
								universityFacultyChairFullName: true,
								universityFacultyChairShortName: true,
								rate: true
							}
						},
						componentTerm: {
							include: {
								component: {
									select: {
										id: true,
										code: true,
										name: true,
										section: {
											select: {
												orderIndex: true,
												sectionType: true
											}
										},
										orderIndex: true,
										componentType: true,
										practiceType: true
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

		if (activeGroups.length === 0) {
			this.logger.warn(
				`WC id=${id}: no active groups — load will have groupCount=0`
			)
		}

		const groupIds = activeGroups.map(g => g.groupId)
		const groupCount = groupIds.length

		const studentCount =
			groupIds.length > 0
				? await this.prisma.student.count({
						where: { groupId: { in: groupIds } }
					})
				: 0

		const rows = wc.componentTerms.map((wct): LoadRow => {
			const t = wct.teacher
			return {
				teacherId: wct.teacherId,
				teacher:
					t !== null
						? {
								id: t.id,
								firstName: t.firstName,
								lastName: t.lastName,
								middleName: t.middleName,
								skillName: t.skillName,
								positionName: t.positionName,
								departmentName:
									t.universityFacultyChairShortName ??
									t.universityFacultyChairFullName ??
									null,
								rate: t.rate.toNumber()
							}
						: null,
				componentId: wct.componentTerm.component.id,
				componentCode: wct.componentTerm.component.code,
				componentName: wct.componentTerm.component.name,
				semesterNumber: wct.componentTerm.semesterNumber,
				groupCount,
				studentCount,
				lecture: wct.lectureHours,
				practical: wct.practicalHours,
				lab: wct.labHours,
				seminar: wct.seminarHours,
				independent: wct.independentHours,
				examPrep: wct.consultationHours,
				practiceMode: wct.practiceMode,
				labMode: wct.labMode,
				subgroupCount:
					wct.subgroupCount ?? wct.componentTerm.subgroupCount ?? 1,
				controlForm: wct.componentTerm.controlForm,
				examFormat: wct.examFormat,
				controlWorksAuditoryCount: wct.controlWorksAuditoryCount,
				controlWorksIndependentCount: wct.controlWorksIndependentCount,
				componentType: wct.componentTerm.component.componentType,
				practiceType: wct.componentTerm.component.practiceType,
				practiceDurationWeeks:
					wct.practiceDurationWeeks?.toNumber() ?? null,
				hasCourseWork: wct.componentTerm.hasCourseWork,
				hasCourseProject: wct.componentTerm.hasCourseProject,
				sectionType: wct.componentTerm.component.section.sectionType,
				diplomaCommitteeSize: wct.diplomaCommitteeSize
			}
		})

		const entries = this.groupAndAggregate(rows)
		await this.applyDiplomaSupervisionHours(entries, id)

		return {
			workingCurriculumId: id,
			academicYear: wc.academicYear,
			generatedAt: new Date().toISOString(),
			teachers: entries
		}
	}

	/**
	 * Додає персональне керівництво дипломними роботами (Наказ МОН №686, п.20) до
	 * підсумку кожного викладача. Масштабується на рівні одного робочого плану
	 * (не всього навчального року), щоб уникнути подвійного підрахунку при агрегації
	 * по кількох планах (`generateAllTeachersSummary`, `generateByTeacher`).
	 */
	private async applyDiplomaSupervisionHours(
		entries: TeacherLoadEntryDto[],
		workingCurriculumId: string
	): Promise<void> {
		const teacherIds = entries
			.map(e => e.teacher?.id)
			.filter((id): id is string => id !== undefined)
		if (teacherIds.length === 0) return

		const diplomaHoursByTeacher =
			await this.diplomaSupervisionService.getTeachersDiplomaHoursByWorkingCurriculum(
				teacherIds,
				workingCurriculumId
			)
		if (diplomaHoursByTeacher.size === 0) return

		for (const entry of entries) {
			if (entry.teacher === null) continue
			const diplomaHours =
				diplomaHoursByTeacher.get(entry.teacher.id) ?? 0
			if (diplomaHours === 0) continue

			const wasExceeded = entry.summary.teachingHoursExceeded
			entry.summary.totalTeachingHours += diplomaHours
			entry.summary.teachingHoursExceeded =
				entry.summary.totalTeachingHours >
				entry.summary.teachingHoursLimit
			if (entry.summary.teachingHoursExceeded && !wasExceeded) {
				entry.summary.warnings.push(
					`Перевищено ліміт навчального навантаження ${entry.summary.teachingHoursLimit} год/рік ` +
						`з урахуванням керівництва дипломними роботами (Наказ МОН №686 п.20; фактично: ` +
						`${Math.round(entry.summary.totalTeachingHours)} год). Ст. 60 Закону №2745-VIII.`
				)
			}
		}
	}

	/**
	 * Повертає всі робочі плани на заданий навчальний рік, де вказаний викладач
	 * є відповідальним хоча б за один компонент, і генерує зведене навантаження.
	 */
	public async generateByTeacher(
		teacherId: string,
		academicYear?: string
	): Promise<TeacherLoadDto[]> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id: teacherId }
		})
		if (!teacher) throw new NotFoundException('Викладача не знайдено.')

		const wcIds = await this.prisma.workingCurriculumComponentTerm.findMany(
			{
				where: {
					teacherId,
					...(academicYear
						? { workingCurriculum: { academicYear } }
						: {})
				},
				select: { workingCurriculumId: true },
				distinct: ['workingCurriculumId']
			}
		)

		const results = await Promise.all(
			wcIds.map(({ workingCurriculumId }) =>
				this.generateByWorkingCurriculum(workingCurriculumId)
			)
		)
		return results
	}

	/**
	 * Навантаження поточного користувача-викладача (для dashboard).
	 * Резолвить профіль викладача за userId сесії, агрегує його навантаження
	 * по всіх робочих планах (опційно — за навчальний рік).
	 */
	public async generateMyLoad(
		userId: string,
		academicYear?: string
	): Promise<MyTeacherLoadDto> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { userId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				middleName: true,
				skillName: true,
				positionName: true,
				universityFacultyChairShortName: true,
				universityFacultyChairFullName: true,
				rate: true
			}
		})

		const empty: MyTeacherLoadDto = {
			teacher: null,
			academicYear: academicYear ?? null,
			totalTeachingHours: 0,
			teachingHoursLimit: 0,
			teachingHoursExceeded: false,
			disciplineCount: 0,
			plans: []
		}
		if (!teacher) return empty

		const loads = await this.generateByTeacher(teacher.id, academicYear)
		if (loads.length === 0) {
			return {
				...empty,
				teacher: this.teacherToSummary(teacher),
				teachingHoursLimit: teachingHoursLimit(teacher.rate.toNumber())
			}
		}

		// Людські назви планів.
		const labels = await this.buildWcLabels(
			loads.map(l => l.workingCurriculumId)
		)

		let total = 0
		const disciplines = new Set<string>()
		let summary: TeacherSummaryDto | null = null
		const plans = []

		for (const load of loads) {
			const entry = load.teachers.find(e => e.teacher?.id === teacher.id)
			if (!entry?.teacher) continue
			summary = entry.teacher
			total += entry.summary.totalTeachingHours
			entry.components.forEach(c => disciplines.add(c.componentName))
			plans.push({
				workingCurriculumId: load.workingCurriculumId,
				academicYear: load.academicYear,
				label:
					labels.get(load.workingCurriculumId) ?? load.academicYear,
				totalTeachingHours: entry.summary.totalTeachingHours,
				components: entry.components
			})
		}

		const rate = summary?.rate ?? teacher.rate.toNumber()
		const limit = teachingHoursLimit(rate)
		return {
			teacher: summary ?? this.teacherToSummary(teacher),
			academicYear: academicYear ?? null,
			totalTeachingHours: total,
			teachingHoursLimit: limit,
			teachingHoursExceeded: total > limit,
			disciplineCount: disciplines.size,
			plans
		}
	}

	/**
	 * Зведене навантаження по ВСІХ викладачах за навчальний рік (для керівництва).
	 * Агрегує результати по всіх робочих планах року.
	 */
	public async generateAllTeachersSummary(
		academicYear: string
	): Promise<AllTeachersLoadDto> {
		const wcs = await this.prisma.workingCurriculum.findMany({
			where: { academicYear },
			select: { id: true }
		})

		const loads = await Promise.all(
			wcs.map(wc => this.generateByWorkingCurriculum(wc.id))
		)

		interface Acc {
			teacher: TeacherSummaryDto
			hours: number
			disciplines: Set<string>
			wcIds: Set<string>
		}
		const acc = new Map<string, Acc>()
		let unassignedComponents = 0

		for (const load of loads) {
			for (const entry of load.teachers) {
				if (!entry.teacher) {
					unassignedComponents += entry.components.length
					continue
				}
				const id = entry.teacher.id
				if (!acc.has(id)) {
					acc.set(id, {
						teacher: entry.teacher,
						hours: 0,
						disciplines: new Set(),
						wcIds: new Set()
					})
				}
				const a = acc.get(id)!
				a.hours += entry.summary.totalTeachingHours
				entry.components.forEach(c =>
					a.disciplines.add(c.componentName)
				)
				a.wcIds.add(load.workingCurriculumId)
			}
		}

		const rows = [...acc.values()]
			.map(a => {
				const limit = teachingHoursLimit(a.teacher.rate)
				return {
					teacher: a.teacher,
					totalTeachingHours: a.hours,
					teachingHoursLimit: limit,
					teachingHoursExceeded: a.hours > limit,
					disciplineCount: a.disciplines.size,
					workingCurriculumCount: a.wcIds.size
				}
			})
			.sort((x, y) => y.totalTeachingHours - x.totalTeachingHours)

		return {
			academicYear,
			generatedAt: new Date().toISOString(),
			rows,
			unassignedComponents
		}
	}

	/** Будує мапу workingCurriculumId → людська назва. */
	private async buildWcLabels(ids: string[]): Promise<Map<string, string>> {
		if (ids.length === 0) return new Map()
		const wcs = await this.prisma.workingCurriculum.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				academicYear: true,
				version: {
					select: {
						curriculum: {
							select: {
								program: {
									select: {
										name: true,
										specialty: { select: { code: true } }
									}
								}
							}
						}
					}
				}
			}
		})
		return new Map(
			wcs.map(wc => {
				const prog = wc.version.curriculum.program
				return [
					wc.id,
					`${prog.specialty.code} ${prog.name} (${wc.academicYear})`
				]
			})
		)
	}

	private teacherToSummary(t: {
		id: string
		firstName: string
		lastName: string
		middleName: string | null
		skillName: string | null
		positionName: string | null
		universityFacultyChairShortName: string | null
		universityFacultyChairFullName: string | null
		rate: { toNumber(): number }
	}): TeacherSummaryDto {
		return {
			id: t.id,
			firstName: t.firstName,
			lastName: t.lastName,
			middleName: t.middleName,
			skillName: t.skillName,
			positionName: t.positionName,
			departmentName:
				t.universityFacultyChairShortName ??
				t.universityFacultyChairFullName ??
				null,
			rate: t.rate.toNumber()
		}
	}

	// ── Private helpers ────────────────────────────────────────────────────────

	private groupAndAggregate(rows: LoadRow[]): TeacherLoadEntryDto[] {
		const groupOrder: Array<string | null> = []
		const grouped = new Map<string | null, LoadRow[]>()

		for (const row of rows) {
			const key = row.teacherId
			if (!grouped.has(key)) {
				grouped.set(key, [])
				groupOrder.push(key)
			}
			grouped.get(key)!.push(row)
		}

		const sortedKeys = [
			...groupOrder.filter((k): k is string => k !== null),
			...(groupOrder.includes(null) ? [null] : [])
		]

		return sortedKeys.map(key => {
			const groupRows = grouped.get(key) ?? []
			const teacher = groupRows[0]?.teacher ?? null
			const components = groupRows.map(r => this.buildComponent(r))
			const summary = this.buildSummary(groupRows, components)

			return {
				teacher:
					teacher !== null ? this.mapTeacherSummary(teacher) : null,
				summary,
				components
			}
		})
	}

	private buildComponent(row: LoadRow): LoadComponentDto {
		const {
			lecture,
			practical,
			lab,
			seminar,
			independent,
			examPrep,
			groupCount,
			studentCount,
			practiceMode,
			labMode,
			subgroupCount,
			controlForm,
			examFormat,
			controlWorksAuditoryCount,
			controlWorksIndependentCount,
			componentType,
			practiceType,
			practiceDurationWeeks,
			hasCourseWork,
			hasCourseProject,
			sectionType,
			diplomaCommitteeSize
		} = row
		const practicalLab = practical + lab

		const hoursPerGroup: HoursPerGroupDto = {
			lecture,
			practicalLab,
			seminar,
			independent,
			examPrep
		}

		// Множники узгоджені з generate() призначень:
		//  • поділ на підгрупи (≥2) множить ВСІ види занять (кожна підгрупа окремо);
		//  • практики/лаб додатково ×groupCount у режимі PER_GROUP;
		//  • лекції/семінари/консультації/СПРС поза підгрупами — потокові (×1).
		const sub = subgroupCount >= 2 ? subgroupCount : 1
		const practiceMul =
			(practiceMode === 'PER_GROUP' ? groupCount : 1) * sub
		const labMul = (labMode === 'PER_GROUP' ? groupCount : 1) * sub
		const practicalLabTotal = practical * practiceMul + lab * labMul
		const lectureTotal = lecture * sub
		const seminarTotal = seminar * sub
		const independentTotal = independent * sub
		const examPrepTotal = examPrep * sub

		// Заліки/екзамени/контрольні/консультації перед контролем (Наказ МОН №686,
		// п.10/11/12/14/16) — не множаться на підгрупи, формула вже враховує
		// groupCount/studentCount напряму.
		const controlAndExam =
			computeSemesterControlHours(
				controlForm,
				examFormat,
				groupCount,
				studentCount
			) +
			computeControlWorksCheckHours(
				controlWorksAuditoryCount,
				controlWorksIndependentCount,
				studentCount
			) +
			computePreControlConsultationHours(controlForm, groupCount)

		// Керівництво практикою (Наказ МОН №686, п.17/18) — навчальна практика множиться на
		// підгрупи (як і practical/lab), виробнича вже враховує studentCount напряму.
		const practiceSupervision = computePracticeSupervisionHours(
			componentType,
			practiceType,
			practiceDurationWeeks,
			studentCount,
			subgroupCount
		)

		// Керівництво курсовими роботами/проєктами (Наказ МОН №686, п.13) — на студента,
		// без множення на підгрупи (керує один викладач незалежно від поділу групи).
		const courseWorkSupervision = computeCourseWorkSupervisionHours(
			hasCourseWork,
			hasCourseProject,
			sectionType,
			studentCount
		)

		// Комісія захисту дипломних робіт (Наказ МОН №686, п.20) — 0.5 год кожному члену
		// комісії на кожного студента; лише для дипломних/кваліфікаційних компонентів.
		// Персональне керівництво дипломом (16 год/студента) сюди НЕ входить — воно
		// прив'язане до конкретного студента, а не до групи, і рахується окремо через
		// DiplomaSupervisionService (додається до підсумку викладача в buildSummary()).
		const isDiplomaComponent =
			componentType === 'DIPLOMA_PROJECT' ||
			componentType === 'QUALIFICATION_WORK_DEFENSE'
		const diplomaCommittee = isDiplomaComponent
			? NORM_DIPLOMA_COMMITTEE_HOURS_PER_MEMBER *
				diplomaCommitteeSize *
				studentCount
			: 0

		const totalHours: TotalHoursDto = {
			lecture: lectureTotal, // ×subgroups
			practicalLab: practicalLabTotal, // ×groupCount (PER_GROUP) ×subgroups
			seminar: seminarTotal, // ×subgroups
			independent: independentTotal, // ×subgroups
			examPrep: examPrepTotal, // ×subgroups
			controlAndExam,
			practiceSupervision,
			courseWorkSupervision,
			diplomaCommittee,
			subtotal:
				lectureTotal +
				practicalLabTotal +
				seminarTotal +
				independentTotal +
				examPrepTotal +
				controlAndExam +
				practiceSupervision +
				courseWorkSupervision +
				diplomaCommittee
		}

		return {
			componentCode: row.componentCode,
			componentName: row.componentName,
			semesterNumber: row.semesterNumber,
			groupCount: row.groupCount,
			studentCount: row.studentCount,
			hoursPerGroup,
			totalHours
		}
	}

	private buildSummary(
		rows: LoadRow[],
		components: LoadComponentDto[]
	): TeacherLoadSummaryDto {
		const totalTeachingHours = components.reduce(
			(s, c) =>
				s +
				c.totalHours.lecture +
				c.totalHours.practicalLab +
				c.totalHours.seminar +
				c.totalHours.independent +
				c.totalHours.examPrep +
				c.totalHours.controlAndExam +
				c.totalHours.practiceSupervision +
				c.totalHours.courseWorkSupervision +
				c.totalHours.diplomaCommittee,
			0
		)

		// Ставка береться з першого рядка групи (всі рядки одного викладача)
		const rate = rows[0]?.teacher?.rate ?? 1.0
		const limit = teachingHoursLimit(rate)
		const teachingHoursExceeded =
			rows[0]?.teacher !== null ? totalTeachingHours > limit : false

		const disciplineCount = new Set(rows.map(r => r.componentId)).size

		const warnings: string[] = []
		if (teachingHoursExceeded) {
			warnings.push(
				`Перевищено ліміт навчального навантаження ${limit} год/рік ` +
					`(${NORM_TEACHING_HOURS_PER_RATE} год × ${rate} ставки; фактично: ${totalTeachingHours} год). ` +
					`Ст. 60 Закону №2745-VIII.`
			)
		}
		if (disciplineCount > NORM_MAX_DISCIPLINES) {
			warnings.push(
				`Більше ${NORM_MAX_DISCIPLINES} дисциплін (фактично: ${disciplineCount}). ` +
					`Рекомендований норматив Наказу МОН №686.`
			)
		}

		return {
			totalTeachingHours,
			teachingHoursLimit: limit,
			teachingHoursExceeded,
			disciplineCount,
			warnings
		}
	}

	private mapTeacherSummary(
		t: NonNullable<LoadRow['teacher']>
	): TeacherSummaryDto {
		return {
			id: t.id,
			firstName: t.firstName,
			lastName: t.lastName,
			middleName: t.middleName,
			skillName: t.skillName,
			positionName: t.positionName,
			departmentName: t.departmentName,
			rate: t.rate
		}
	}
}
