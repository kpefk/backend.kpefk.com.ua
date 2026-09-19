import {
	type AdmissionBasis,
	type CalendarWeekType,
	type CurriculumSectionType,
	type EducationForm,
	type TermControlForm
} from '@prisma/client'

/**
 * Нормативні перевірки навчального плану.
 *
 * Джерела (тексти — в репозиторії `Законодавча_база`):
 *  • Закон України «Про фахову передвищу освіту» № 2745-VIII — ст. 49, ст. 54 ч. 1 п. 17;
 *  • Типове положення про організацію освітнього процесу в закладах фахової
 *    передвищої освіти, затверджене наказом МОН від 02.05.2023 № 510 —
 *    п. 5.2, 5.6, 5.8, 5.11, розд. IX (п. 9.1–9.5);
 *  • стандарти фахової передвищої освіти за спеціальностями (розд. 3 — обсяг ЄКТС).
 *
 * Модуль навмисно не має залежностей від Prisma-клієнта чи Nest — лише чисті
 * функції над простими структурами, щоб норми можна було покрити тестами
 * без бази даних.
 */

// ─── Нормативні величини ──────────────────────────────────────────────────────

/** Наказ МОН № 510, п. 9.3: «Обсяг одного кредиту ЄКТС становить 30 годин». */
export const NORM_HOURS_PER_ECTS = 30

/**
 * Наказ МОН № 510, п. 9.3: «Навантаження одного навчального року за денною формою
 * здобуття освіти становить, як правило, 60 кредитів ЄКТС».
 * «Як правило» — тому це попередження, а не блок.
 */
export const NORM_ECTS_PER_YEAR = 60

/** Наказ МОН № 510, п. 9.3: «Річний бюджет часу здобувача … становить 1800 годин». */
export const NORM_HOURS_PER_YEAR = NORM_ECTS_PER_YEAR * NORM_HOURS_PER_ECTS

/**
 * Наказ МОН № 510, п. 9.5: «Максимальна рекомендована кількість годин навчальних
 * занять на один кредит для здобувачів освіти становить 20 годин».
 * Виняток — окремі спеціальності галузей «22 Охорона здоров'я», «02 Культура і
 * мистецтво», «01 Освіта/Педагогіка»; заклад їх не провадить, тож не виділяємо.
 */
export const NORM_MAX_AUDITORY_HOURS_PER_ECTS = 20

/**
 * Наказ МОН № 510, п. 9.5: «Якщо формою підсумкового контролю з дисципліни є
 * екзамен(и), то на підготовку та проходження кожного з них виділяється один
 * кредит ЄКТС».
 */
export const NORM_ECTS_PER_EXAM = 1

/**
 * Наказ МОН № 510, п. 9.5: курсова робота як окремий модуль дисципліни —
 * «не менше одного кредиту ЄКТС».
 */
export const NORM_MIN_ECTS_COURSE_WORK_MODULE = 1

/**
 * Наказ МОН № 510, п. 9.5: курсова робота як окремий освітній компонент —
 * «не менше трьох кредитів ЄКТС».
 */
export const NORM_MIN_ECTS_COURSE_WORK_COMPONENT = 3

/**
 * Наказ МОН № 510, п. 5.8 (те саме — ст. 54 ч. 1 п. 17 Закону № 2745-VIII):
 * «Загальний обсяг навчальних дисциплін для вільного вибору здобувачів освіти
 * становить не менше десяти відсотків загальної кількості кредитів ЄКТС,
 * передбачених для освітньо-професійної програми».
 *
 * Норма «не менш як 25 відсотків» стосується ВИЩОЇ освіти (ст. 62 ч. 1 п. 15
 * Закону № 1556-VII) і до фахової передвищої освіти не застосовується.
 */
export const NORM_MIN_ELECTIVE_SHARE = 0.1

/**
 * Наказ МОН № 510, п. 5.8: «обсяг пропозиції таких дисциплін у відкритому переліку
 * має становити не менше подвійного загального обсягу навчальних дисциплін для
 * вільного вибору здобувачів освіти у кредитах ЄКТС».
 */
export const NORM_MIN_ELECTIVE_OFFER_FACTOR = 2

/** Наказ МОН № 510, п. 9.1: «Тривалість навчального року … становить 52 тижні». */
export const NORM_WEEKS_PER_YEAR = 52

/** Наказ МОН № 510, п. 9.1: «не менше 8 тижнів становить сумарна тривалість канікул». */
export const NORM_MIN_HOLIDAY_WEEKS = 8

/**
 * Наказ МОН № 510, п. 9.2: «Тривалість теоретичного навчання, обов'язкової
 * практичної підготовки та контрольних заходів складає не більше 40 тижнів у
 * навчальному році».
 */
export const NORM_MAX_INSTRUCTION_WEEKS = 40

/**
 * Наказ МОН № 510, п. 9.2: «До 4 тижнів можуть бути використані на атестацію
 * здобувачів …, державну підсумкову атестацію …, для перескладання контрольних
 * заходів та повторного вивчення окремих освітніх компонентів тощо».
 */
export const NORM_MAX_ATTESTATION_WEEKS = 4

/**
 * Розділи, що НЕ входять в обсяг освітньо-професійної програми:
 *  • SECONDARY_EDUCATION — інтегрована освітня програма профільної середньої
 *    освіти (Наказ МОН № 510, п. 5.11: для вступу на основі базової середньої
 *    освіти ОПП інтегрується з програмою ПЗСО, але обсяг ОПП визначає стандарт);
 *  • OPTIONAL_COURSES — факультативи, поза переліком освітніх компонентів ОПП
 *    (Наказ МОН № 510, п. 5.4).
 */
const NON_OPP_SECTION_TYPES: ReadonlySet<CurriculumSectionType> =
	new Set<CurriculumSectionType>(['SECONDARY_EDUCATION', 'OPTIONAL_COURSES'])

/** Типи тижнів, що формують «теоретичне навчання + практика + контрольні заходи» (п. 9.2). */
const INSTRUCTION_WEEK_TYPES: ReadonlySet<CalendarWeekType> =
	new Set<CalendarWeekType>([
		'INSTRUCTION',
		'EXAM_SESSION',
		'PRACTICE',
		'GRADUATION_WORK'
	])

/** Типи тижнів, що належать до атестації та перескладань (п. 9.2, до 4 тижнів). */
const ATTESTATION_WEEK_TYPES: ReadonlySet<CalendarWeekType> =
	new Set<CalendarWeekType>(['STATE_ATTESTATION', 'DEFENSE'])

// ─── Вхідні структури ─────────────────────────────────────────────────────────

export interface NormTermInput {
	readonly semesterNumber: number
	readonly ects: number
	readonly hours: number
	readonly controlForm: TermControlForm | null
	readonly hasCourseWork: boolean
	readonly hasCourseProject: boolean
}

export interface NormComponentInput {
	readonly name: string
	readonly code: string | null
	readonly sectionType: CurriculumSectionType
	readonly isMandatory: boolean
	readonly componentType: string
	readonly totalEcts: number
	readonly totalHours: number
	readonly auditoryHours: number | null
	readonly lectureHours: number | null
	readonly practicalHours: number | null
	readonly seminarHours: number | null
	readonly labHours: number | null
	readonly selfStudyHours: number | null
	readonly otherHours: number | null
	readonly electiveBlockId: string | null
	readonly terms: readonly NormTermInput[]
}

export interface NormElectiveBlockInput {
	readonly id: string
	readonly name: string
	/** Скільки компонентів блоку здобувач обирає (верхня межа). */
	readonly maxSelections: number
	/** ЄКТС кожної альтернативи, запропонованої у блоці. */
	readonly optionEcts: readonly number[]
}

export interface NormCalendarWeekInput {
	readonly courseNumber: number
	readonly weekType: CalendarWeekType
}

export interface CurriculumNormInput {
	/** Задекларований обсяг плану (`Curriculum.totalEcts`). */
	readonly declaredTotalEcts: number
	/**
	 * Нормативний обсяг ОПП зі стандарту ФПО за спеціальністю (`Specialty.normativeEcts`).
	 * null = стандарт відсутній або ще не внесено — перевірка обсягу пропускається
	 * (Наказ МОН № 510, п. 5.2: за відсутності стандарту заклад визначає обсяг сам).
	 */
	readonly normativeEcts: number | null
	readonly educationForm: EducationForm
	readonly admissionBasis: AdmissionBasis
	readonly studyDurationMonths: number
	readonly components: readonly NormComponentInput[]
	readonly electiveBlocks: readonly NormElectiveBlockInput[]
	readonly calendar: readonly NormCalendarWeekInput[]
	/** Кількість рядків таблиці бюджету часу версії плану. */
	readonly timeBudgetEntryCount: number
}

export type NormSeverity = 'BLOCK' | 'WARN'

export interface NormFinding {
	readonly severity: NormSeverity
	/** Стабільний код для тестів і фронтенду. */
	readonly code: string
	/** Пункт нормативного акта, з якого походить вимога. */
	readonly source: string
	readonly message: string
}

// ─── Допоміжні ────────────────────────────────────────────────────────────────

const round2 = (value: number): number => Math.round(value * 100) / 100

/** Компоненти, що формують обсяг ОПП (без інтегрованої ПЗСО та факультативів). */
function oppComponents(
	components: readonly NormComponentInput[]
): readonly NormComponentInput[] {
	return components.filter(c => !NON_OPP_SECTION_TYPES.has(c.sectionType))
}

/** Нормативна тривалість навчання в роках, округлена вгору до півріччя. */
function studyYears(studyDurationMonths: number): number {
	return studyDurationMonths > 0 ? studyDurationMonths / 12 : 0
}

// ─── Перевірки ────────────────────────────────────────────────────────────────

/**
 * Обсяг плану проти стандарту ФПО.
 * Наказ МОН № 510, п. 5.6; стандарти ФПО, розд. 3.
 */
function checkTotalEcts(input: CurriculumNormInput): NormFinding[] {
	const findings: NormFinding[] = []
	const actual = round2(
		oppComponents(input.components).reduce((s, c) => s + c.totalEcts, 0)
	)

	if (Math.abs(actual - input.declaredTotalEcts) > 0.01) {
		findings.push({
			severity: 'BLOCK',
			code: 'ECTS_SUM_MISMATCH',
			source: 'Наказ МОН № 510, п. 5.11',
			message:
				`Сума ЄКТС освітніх компонентів ОПП (${actual}) не збігається із задекларованим ` +
				`обсягом плану (${input.declaredTotalEcts}). Компоненти інтегрованої програми ` +
				'профільної середньої освіти та факультативи в обсяг ОПП не входять.'
		})
	}

	if (input.normativeEcts === null) {
		findings.push({
			severity: 'WARN',
			code: 'STANDARD_ECTS_UNKNOWN',
			source: 'Наказ МОН № 510, п. 5.2, 5.6',
			message:
				'Для спеціальності не внесено нормативний обсяг ЄКТС зі стандарту ФПО — ' +
				'обсяг плану не звірено зі стандартом.'
		})
		return findings
	}

	// На основі ПТО/ФПО/ВО обсяг визначає заклад, але не менше 50 % (стандарти, розд. 3).
	// У системі така основа вступу не змодельована (AdmissionBasis має лише 9/11 класів),
	// тож для обох основ очікуємо повний нормативний обсяг ОПП.
	if (Math.abs(input.declaredTotalEcts - input.normativeEcts) > 0.01) {
		findings.push({
			severity: 'BLOCK',
			code: 'STANDARD_ECTS_MISMATCH',
			source: 'Наказ МОН № 510, п. 5.6; стандарт ФПО, розд. 3',
			message:
				`Обсяг плану (${input.declaredTotalEcts} ЄКТС) не відповідає нормативному обсягу ` +
				`освітньо-професійної програми за стандартом (${input.normativeEcts} ЄКТС).`
		})
	}

	return findings
}

/**
 * Частка вибіркових компонентів та обсяг пропозиції у відкритому переліку.
 * Наказ МОН № 510, п. 5.8; ст. 54 ч. 1 п. 17 Закону № 2745-VIII.
 */
function checkElectiveShare(input: CurriculumNormInput): NormFinding[] {
	const findings: NormFinding[] = []
	const opp = oppComponents(input.components)
	const totalEcts = opp.reduce((s, c) => s + c.totalEcts, 0)
	if (totalEcts <= 0) return findings

	// Обсяг вибору = скільки кредитів здобувач реально обирає. Для компонентів,
	// зібраних у блоки, це maxSelections × середній обсяг альтернативи блоку;
	// для поодиноких вибіркових компонентів поза блоками — їх власний обсяг.
	let selectableEcts = 0
	let offeredEcts = 0

	for (const block of input.electiveBlocks) {
		if (block.optionEcts.length === 0) {
			findings.push({
				severity: 'BLOCK',
				code: 'ELECTIVE_BLOCK_EMPTY',
				source: 'Наказ МОН № 510, п. 5.8',
				message: `Вибірковий блок «${block.name}» не містить жодної альтернативи.`
			})
			continue
		}
		const blockOffered = block.optionEcts.reduce((s, e) => s + e, 0)
		const averageOption = blockOffered / block.optionEcts.length
		const chosen = Math.min(block.maxSelections, block.optionEcts.length)
		selectableEcts += averageOption * chosen
		offeredEcts += blockOffered

		if (
			blockOffered <
			averageOption * chosen * NORM_MIN_ELECTIVE_OFFER_FACTOR - 0.01
		) {
			findings.push({
				severity: 'WARN',
				code: 'ELECTIVE_BLOCK_OFFER_TOO_NARROW',
				source: 'Наказ МОН № 510, п. 5.8',
				message:
					`Блок «${block.name}»: пропозиція ${round2(blockOffered)} ЄКТС при обсязі вибору ` +
					`${round2(averageOption * chosen)} ЄКТС. Норма — не менше подвійного обсягу вибору ` +
					`(${round2(averageOption * chosen * NORM_MIN_ELECTIVE_OFFER_FACTOR)} ЄКТС), ` +
					`тобто щонайменше ${chosen * NORM_MIN_ELECTIVE_OFFER_FACTOR} альтернатив.`
			})
		}
	}

	const looseElectives = opp.filter(
		c => !c.isMandatory && c.electiveBlockId === null
	)
	for (const component of looseElectives) {
		selectableEcts += component.totalEcts
		offeredEcts += component.totalEcts
	}

	const share = selectableEcts / totalEcts
	if (share < NORM_MIN_ELECTIVE_SHARE) {
		findings.push({
			severity: 'BLOCK',
			code: 'ELECTIVE_SHARE_BELOW_MIN',
			source: 'Наказ МОН № 510, п. 5.8; ст. 54 ч. 1 п. 17 Закону № 2745-VIII',
			message:
				`Обсяг дисциплін для вільного вибору — ${round2(selectableEcts)} ЄКТС ` +
				`(${Math.round(share * 100)} % від ${round2(totalEcts)} ЄКТС ОПП). ` +
				`Норма — не менше ${NORM_MIN_ELECTIVE_SHARE * 100} % ` +
				`(${round2(totalEcts * NORM_MIN_ELECTIVE_SHARE)} ЄКТС).`
		})
	}

	if (
		selectableEcts > 0 &&
		offeredEcts < selectableEcts * NORM_MIN_ELECTIVE_OFFER_FACTOR - 0.01
	) {
		findings.push({
			severity: 'WARN',
			code: 'ELECTIVE_OFFER_BELOW_MIN',
			source: 'Наказ МОН № 510, п. 5.8',
			message:
				`Загальна пропозиція вибіркових дисциплін — ${round2(offeredEcts)} ЄКТС ` +
				`при обсязі вибору ${round2(selectableEcts)} ЄКТС. Норма — не менше подвійного ` +
				`обсягу вибору (${round2(selectableEcts * NORM_MIN_ELECTIVE_OFFER_FACTOR)} ЄКТС).`
		})
	}

	return findings
}

/**
 * Узгодженість кредитів і годин на рівні компонента та семестру.
 * Наказ МОН № 510, п. 9.3 (1 кредит = 30 год) і п. 9.5 (≤ 20 аудиторних год/кредит).
 */
function checkComponentEctsHours(input: CurriculumNormInput): NormFinding[] {
	const findings: NormFinding[] = []

	for (const component of input.components) {
		const label = component.code
			? `${component.code} «${component.name}»`
			: `«${component.name}»`

		// Компоненти інтегрованої ПЗСО ведуться в годинах (ЄКТС = 0) — п. 9.3 до них
		// не застосовується, бо профільна середня освіта не вимірюється в ЄКТС.
		if (
			component.totalEcts > 0 &&
			Math.abs(
				component.totalHours - component.totalEcts * NORM_HOURS_PER_ECTS
			) > 0.5
		) {
			findings.push({
				severity: 'BLOCK',
				code: 'COMPONENT_HOURS_ECTS_MISMATCH',
				source: 'Наказ МОН № 510, п. 9.3',
				message:
					`${label}: ${component.totalHours} год при ${component.totalEcts} ЄКТС. ` +
					`Норма — ${NORM_HOURS_PER_ECTS} год на кредит ` +
					`(${component.totalEcts * NORM_HOURS_PER_ECTS} год).`
			})
		}

		const termEcts = component.terms.reduce((s, t) => s + t.ects, 0)
		if (
			component.totalEcts > 0 &&
			component.terms.length > 0 &&
			Math.abs(termEcts - component.totalEcts) > 0.01
		) {
			findings.push({
				severity: 'BLOCK',
				code: 'TERM_ECTS_SUM_MISMATCH',
				source: 'Наказ МОН № 510, п. 5.11',
				message:
					`${label}: сума ЄКТС по семестрах (${round2(termEcts)}) не дорівнює ` +
					`обсягу компонента (${component.totalEcts} ЄКТС).`
			})
		}

		if (
			component.auditoryHours !== null &&
			component.totalEcts > 0 &&
			component.auditoryHours >
				component.totalEcts * NORM_MAX_AUDITORY_HOURS_PER_ECTS
		) {
			findings.push({
				severity: 'WARN',
				code: 'AUDITORY_HOURS_PER_ECTS_EXCEEDED',
				source: 'Наказ МОН № 510, п. 9.5',
				message:
					`${label}: ${component.auditoryHours} аудиторних год на ${component.totalEcts} ЄКТС ` +
					`(${round2(component.auditoryHours / component.totalEcts)} год/кредит). ` +
					`Рекомендований максимум — ${NORM_MAX_AUDITORY_HOURS_PER_ECTS} год/кредит.`
			})
		}
	}

	return findings
}

/**
 * Кредити під екзамени та курсові роботи.
 * Наказ МОН № 510, п. 9.5.
 */
function checkControlEcts(input: CurriculumNormInput): NormFinding[] {
	const findings: NormFinding[] = []

	for (const component of oppComponents(input.components)) {
		const label = component.code
			? `${component.code} «${component.name}»`
			: `«${component.name}»`

		const examTerms = component.terms.filter(t => t.controlForm === 'EXAM')
		if (examTerms.length > 0 && component.totalEcts > 0) {
			const required = examTerms.length * NORM_ECTS_PER_EXAM
			if (component.totalEcts < required) {
				findings.push({
					severity: 'WARN',
					code: 'EXAM_ECTS_NOT_RESERVED',
					source: 'Наказ МОН № 510, п. 9.5',
					message:
						`${label}: ${examTerms.length} екзамен(и) при обсязі ${component.totalEcts} ЄКТС. ` +
						`На підготовку та проходження кожного екзамену норма виділяє ` +
						`${NORM_ECTS_PER_EXAM} кредит ЄКТС (разом щонайменше ${required}).`
				})
			}
		}

		const hasCourseWork = component.terms.some(
			t => t.hasCourseWork || t.hasCourseProject
		)
		if (hasCourseWork) {
			// Курсова як окремий компонент плану — власний рядок з типом COURSE_WORK/COURSE_PROJECT.
			const isStandaloneCourseWork =
				component.componentType === 'COURSE_WORK' ||
				component.componentType === 'COURSE_PROJECT'
			const minimum = isStandaloneCourseWork
				? NORM_MIN_ECTS_COURSE_WORK_COMPONENT
				: NORM_MIN_ECTS_COURSE_WORK_MODULE
			if (component.totalEcts > 0 && component.totalEcts < minimum) {
				findings.push({
					severity: 'WARN',
					code: 'COURSE_WORK_ECTS_BELOW_MIN',
					source: 'Наказ МОН № 510, п. 9.5',
					message:
						`${label}: курсова робота/проєкт при обсязі ${component.totalEcts} ЄКТС. ` +
						`Норма — не менше ${minimum} кредит(ів) ЄКТС ` +
						`(${isStandaloneCourseWork ? 'окремий компонент' : 'окремий модуль дисципліни'}).`
				})
			}
		}
	}

	return findings
}

/**
 * Внутрішня узгодженість розподілу годин компонента.
 *
 * Наказ МОН № 510, п. 9.5 абз. 2: «Встановлені для освітніх компонентів кредити
 * перераховується в години, які розподіляються на навчальні заняття, практичну
 * підготовку, самостійну роботу здобувачів освіти та підготовку і проходження
 * контрольних заходів»; п. 9.4 перелічує складові навантаження.
 *
 * Перевіряємо саме структурований розподіл компонента, а не текстову таблицю
 * бюджету часу: підписи її рядків довільні (`TimeBudgetEntry.label`), тож
 * зіставляти по них ненадійно. Порожність самої таблиці фіксуємо окремо.
 */
function checkHoursBreakdown(input: CurriculumNormInput): NormFinding[] {
	const findings: NormFinding[] = []

	for (const component of input.components) {
		const label = component.code
			? `${component.code} «${component.name}»`
			: `«${component.name}»`

		const lessonParts = [
			component.lectureHours,
			component.practicalHours,
			component.seminarHours,
			component.labHours
		]
		// Розподіл заповнюється не для всіх компонентів (напр. атестація) —
		// перевіряємо лише там, де його реально введено.
		const hasLessonBreakdown = lessonParts.some(h => h !== null && h > 0)

		if (hasLessonBreakdown && component.auditoryHours !== null) {
			const lessonSum = lessonParts.reduce<number>(
				(s, h) => s + (h ?? 0),
				0
			)
			if (lessonSum > component.auditoryHours) {
				findings.push({
					severity: 'BLOCK',
					code: 'LESSON_HOURS_EXCEED_AUDITORY',
					source: 'Наказ МОН № 510, п. 9.4',
					message:
						`${label}: сума годин за видами занять (${lessonSum}) перевищує ` +
						`аудиторні години компонента (${component.auditoryHours}).`
				})
			}
		}

		const allocated =
			(component.auditoryHours ?? 0) +
			(component.selfStudyHours ?? 0) +
			(component.otherHours ?? 0)
		const hasAllocation =
			component.auditoryHours !== null ||
			component.selfStudyHours !== null ||
			component.otherHours !== null

		if (
			hasAllocation &&
			component.totalHours > 0 &&
			allocated > component.totalHours
		) {
			findings.push({
				severity: 'BLOCK',
				code: 'ALLOCATED_HOURS_EXCEED_TOTAL',
				source: 'Наказ МОН № 510, п. 9.5',
				message:
					`${label}: розподілено ${allocated} год (аудиторні + самостійна + інші) ` +
					`при загальному обсязі компонента ${component.totalHours} год.`
			})
		}
	}

	if (input.timeBudgetEntryCount === 0) {
		findings.push({
			severity: 'WARN',
			code: 'TIME_BUDGET_EMPTY',
			source: 'Наказ МОН № 510, п. 9.4–9.5',
			message:
				'Таблицю бюджету часу не заповнено — зведений розподіл годин плану ' +
				'не задокументовано.'
		})
	}

	return findings
}

/**
 * Річне навантаження здобувача.
 * Наказ МОН № 510, п. 9.3.
 */
function checkAnnualLoad(input: CurriculumNormInput): NormFinding[] {
	const years = studyYears(input.studyDurationMonths)
	if (years <= 0) return []

	// Норма 60 кредитів/рік сформульована для денної форми.
	if (input.educationForm !== 'FULL_TIME') return []

	const perYear = input.declaredTotalEcts / years
	if (Math.abs(perYear - NORM_ECTS_PER_YEAR) <= 5) return []

	return [
		{
			severity: 'WARN',
			code: 'ANNUAL_ECTS_OFF_NORM',
			source: 'Наказ МОН № 510, п. 9.3',
			message:
				`Річне навантаження — ${round2(perYear)} ЄКТС (${round2(perYear * NORM_HOURS_PER_ECTS)} год) ` +
				`при нормі ${NORM_ECTS_PER_YEAR} ЄКТС (${NORM_HOURS_PER_YEAR} год) на навчальний рік ` +
				`за денною формою. Обсяг ${input.declaredTotalEcts} ЄКТС на ${round2(years)} р. навчання.`
		}
	]
}

/**
 * Графік освітнього процесу.
 * Наказ МОН № 510, п. 9.1 і п. 9.2.
 */
function checkCalendar(input: CurriculumNormInput): NormFinding[] {
	if (input.calendar.length === 0) {
		return [
			{
				severity: 'WARN',
				code: 'CALENDAR_EMPTY',
				source: 'Наказ МОН № 510, п. 5.11',
				message:
					'Графік освітнього процесу не заповнено — тривалість навчального року, ' +
					'канікул і контрольних заходів не перевірено.'
			}
		]
	}

	const findings: NormFinding[] = []
	const byCourse = new Map<number, NormCalendarWeekInput[]>()
	for (const week of input.calendar) {
		const bucket = byCourse.get(week.courseNumber)
		if (bucket === undefined) byCourse.set(week.courseNumber, [week])
		else bucket.push(week)
	}

	const lastCourse = Math.max(...byCourse.keys())

	for (const [courseNumber, weeks] of [...byCourse].sort(
		(a, b) => a[0] - b[0]
	)) {
		const holidays = weeks.filter(w => w.weekType === 'HOLIDAY').length
		const instruction = weeks.filter(w =>
			INSTRUCTION_WEEK_TYPES.has(w.weekType)
		).length
		const attestation = weeks.filter(w =>
			ATTESTATION_WEEK_TYPES.has(w.weekType)
		).length

		// п. 9.1 — тривалість року 52 тижні, крім останнього року навчання.
		if (
			courseNumber !== lastCourse &&
			weeks.length !== NORM_WEEKS_PER_YEAR
		) {
			findings.push({
				severity: 'WARN',
				code: 'ACADEMIC_YEAR_WEEKS_OFF_NORM',
				source: 'Наказ МОН № 510, п. 9.1',
				message:
					`Курс ${courseNumber}: у графіку ${weeks.length} тижнів при нормі ` +
					`${NORM_WEEKS_PER_YEAR}.`
			})
		}

		if (courseNumber !== lastCourse && holidays < NORM_MIN_HOLIDAY_WEEKS) {
			findings.push({
				severity: 'BLOCK',
				code: 'HOLIDAY_WEEKS_BELOW_MIN',
				source: 'Наказ МОН № 510, п. 9.1; ст. 54 ч. 1 п. 28 Закону № 2745-VIII',
				message:
					`Курс ${courseNumber}: ${holidays} тижнів канікул при нормі не менше ` +
					`${NORM_MIN_HOLIDAY_WEEKS}.`
			})
		}

		if (instruction > NORM_MAX_INSTRUCTION_WEEKS) {
			findings.push({
				severity: 'BLOCK',
				code: 'INSTRUCTION_WEEKS_EXCEEDED',
				source: 'Наказ МОН № 510, п. 9.2',
				message:
					`Курс ${courseNumber}: ${instruction} тижнів теоретичного навчання, практичної ` +
					`підготовки та контрольних заходів при максимумі ${NORM_MAX_INSTRUCTION_WEEKS}.`
			})
		}

		if (attestation > NORM_MAX_ATTESTATION_WEEKS) {
			findings.push({
				severity: 'WARN',
				code: 'ATTESTATION_WEEKS_EXCEEDED',
				source: 'Наказ МОН № 510, п. 9.2',
				message:
					`Курс ${courseNumber}: ${attestation} тижнів атестації та перескладань ` +
					`при максимумі ${NORM_MAX_ATTESTATION_WEEKS}.`
			})
		}
	}

	return findings
}

// ─── Точка входу ──────────────────────────────────────────────────────────────

/**
 * Проганяє всі нормативні перевірки навчального плану.
 * Повертає список знахідок; `BLOCK` не дозволяє публікацію версії, `WARN`
 * показується користувачеві, але публікацію не зупиняє.
 */
export function validateCurriculumNorms(
	input: CurriculumNormInput
): NormFinding[] {
	return [
		...checkTotalEcts(input),
		...checkElectiveShare(input),
		...checkComponentEctsHours(input),
		...checkHoursBreakdown(input),
		...checkControlEcts(input),
		...checkAnnualLoad(input),
		...checkCalendar(input)
	]
}

/** Чи є серед знахідок такі, що блокують публікацію. */
export function hasBlockingFindings(findings: readonly NormFinding[]): boolean {
	return findings.some(f => f.severity === 'BLOCK')
}

/** Рядкове представлення знахідки для повідомлень і логів. */
export function formatFinding(finding: NormFinding): string {
	return `[${finding.source}] ${finding.message}`
}
