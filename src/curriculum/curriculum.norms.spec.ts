/**
 * Unit tests for curriculum.norms — нормативні перевірки навчального плану.
 *
 * Джерела норм: Наказ МОН № 510 (розд. V і IX), ст. 54 ч. 1 п. 17 Закону № 2745-VIII,
 * стандарти ФПО (розд. 3).
 *
 * Pure functions, no Prisma/DB required.
 * Run: npx jest curriculum.norms.spec.ts
 */
import {
	type CurriculumNormInput,
	hasBlockingFindings,
	NORM_ECTS_PER_YEAR,
	NORM_HOURS_PER_ECTS,
	NORM_MIN_ELECTIVE_OFFER_FACTOR,
	NORM_MIN_ELECTIVE_SHARE,
	type NormComponentInput,
	validateCurriculumNorms
} from './curriculum.norms'

// ─── Фікстури ─────────────────────────────────────────────────────────────────

function component(
	overrides: Partial<NormComponentInput> = {}
): NormComponentInput {
	const totalEcts = overrides.totalEcts ?? 6
	return {
		name: 'Дисципліна',
		code: 'ОК 1',
		sectionType: 'PROFESSIONAL_COMPETENCY',
		isMandatory: true,
		componentType: 'DISCIPLINE',
		totalEcts,
		totalHours: totalEcts * NORM_HOURS_PER_ECTS,
		auditoryHours: null,
		lectureHours: null,
		practicalHours: null,
		seminarHours: null,
		labHours: null,
		selfStudyHours: null,
		otherHours: null,
		electiveBlockId: null,
		terms: [],
		...overrides
	}
}

/** План на 180 ЄКТС: 162 обов'язкових + 18 вибіркових (рівно 10 %). */
function baseInput(
	overrides: Partial<CurriculumNormInput> = {}
): CurriculumNormInput {
	return {
		declaredTotalEcts: 180,
		normativeEcts: 180,
		educationForm: 'FULL_TIME',
		admissionBasis: 'AFTER_11TH_GRADE',
		studyDurationMonths: 36,
		components: [
			component({ code: 'ОК 1', totalEcts: 162 }),
			component({
				code: 'ВК 1',
				totalEcts: 18,
				isMandatory: false,
				sectionType: 'ELECTIVE'
			})
		],
		electiveBlocks: [],
		calendar: [],
		timeBudgetEntryCount: 3,
		...overrides
	}
}

function codes(input: CurriculumNormInput): string[] {
	return validateCurriculumNorms(input).map(f => f.code)
}

// ─── Обсяг плану проти стандарту ──────────────────────────────────────────────

describe('обсяг ОПП (Наказ МОН № 510, п. 5.6; стандарт ФПО розд. 3)', () => {
	it('план, що збігається зі стандартом, не дає знахідок щодо обсягу', () => {
		expect(codes(baseInput())).not.toContain('STANDARD_ECTS_MISMATCH')
		expect(codes(baseInput())).not.toContain('ECTS_SUM_MISMATCH')
	})

	it('розходження суми компонентів із задекларованим обсягом блокує', () => {
		const findings = validateCurriculumNorms(
			baseInput({
				components: [component({ totalEcts: 100 })],
				declaredTotalEcts: 180
			})
		)
		const sum = findings.find(f => f.code === 'ECTS_SUM_MISMATCH')
		expect(sum?.severity).toBe('BLOCK')
	})

	it('обсяг, що не дорівнює нормативному за стандартом, блокує', () => {
		const findings = validateCurriculumNorms(
			baseInput({
				declaredTotalEcts: 150,
				normativeEcts: 180,
				components: [
					component({ totalEcts: 135 }),
					component({
						totalEcts: 15,
						isMandatory: false,
						sectionType: 'ELECTIVE'
					})
				],
				studyDurationMonths: 30
			})
		)
		expect(
			findings.find(f => f.code === 'STANDARD_ECTS_MISMATCH')?.severity
		).toBe('BLOCK')
	})

	it('без внесеного стандарту обсяг не звіряється, але є попередження', () => {
		const findings = validateCurriculumNorms(
			baseInput({ normativeEcts: null })
		)
		expect(
			findings.find(f => f.code === 'STANDARD_ECTS_UNKNOWN')?.severity
		).toBe('WARN')
		expect(codes(baseInput({ normativeEcts: null }))).not.toContain(
			'STANDARD_ECTS_MISMATCH'
		)
	})

	it('компоненти ЗСО та факультативи не входять в обсяг ОПП', () => {
		// 180 ЄКТС ОПП + окремий блок ЗСО, що ведеться в годинах (ЄКТС = 0).
		const input = baseInput({
			components: [
				component({ totalEcts: 162 }),
				component({
					totalEcts: 18,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				}),
				component({
					code: 'ЗСО 1',
					totalEcts: 0,
					totalHours: 420,
					sectionType: 'SECONDARY_EDUCATION'
				})
			]
		})
		expect(codes(input)).not.toContain('ECTS_SUM_MISMATCH')
	})
})

// ─── Вибіркові компоненти ─────────────────────────────────────────────────────

describe('вибіркові компоненти (Наказ МОН № 510, п. 5.8; ст. 54 ч. 1 п. 17)', () => {
	it('норма — 10 %, а не 25 % (25 % — норма вищої освіти)', () => {
		expect(NORM_MIN_ELECTIVE_SHARE).toBe(0.1)
	})

	it('рівно 10 % вибіркових проходить перевірку', () => {
		expect(codes(baseInput())).not.toContain('ELECTIVE_SHARE_BELOW_MIN')
	})

	it('15 % вибіркових — теж проходить, хоча це менше 25 %', () => {
		const input = baseInput({
			components: [
				component({ totalEcts: 153 }),
				component({
					totalEcts: 27,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		expect(codes(input)).not.toContain('ELECTIVE_SHARE_BELOW_MIN')
	})

	it('менше 10 % вибіркових блокує публікацію', () => {
		const input = baseInput({
			components: [
				component({ totalEcts: 171 }),
				component({
					totalEcts: 9,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		const findings = validateCurriculumNorms(input)
		const finding = findings.find(
			f => f.code === 'ELECTIVE_SHARE_BELOW_MIN'
		)
		expect(finding?.severity).toBe('BLOCK')
		expect(finding?.message).toContain('5 %')
		expect(hasBlockingFindings(findings)).toBe(true)
	})

	it('частка рахується в кредитах ЄКТС, а не в годинах', () => {
		// ЗСО-компонент з великим обсягом годин і нульовими ЄКТС не має
		// занижувати частку вибіркових.
		const input = baseInput({
			components: [
				component({ totalEcts: 162 }),
				component({
					totalEcts: 18,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				}),
				component({
					totalEcts: 0,
					totalHours: 2000,
					sectionType: 'SECONDARY_EDUCATION'
				})
			]
		})
		expect(codes(input)).not.toContain('ELECTIVE_SHARE_BELOW_MIN')
	})

	it('пропозиція має бути не менше подвійного обсягу вибору', () => {
		expect(NORM_MIN_ELECTIVE_OFFER_FACTOR).toBe(2)
		// Блок: обирається 1 дисципліна по 6 ЄКТС, у переліку лише 1 альтернатива.
		const input = baseInput({
			components: [component({ totalEcts: 162 })],
			declaredTotalEcts: 162,
			normativeEcts: 162,
			electiveBlocks: [
				{
					id: 'b1',
					name: 'Блок ВК 1',
					maxSelections: 1,
					optionEcts: [6]
				}
			]
		})
		const findings = validateCurriculumNorms(input)
		expect(
			findings.find(f => f.code === 'ELECTIVE_BLOCK_OFFER_TOO_NARROW')
				?.severity
		).toBe('WARN')
	})

	it('дві альтернативи на один вибір задовольняють подвійну пропозицію', () => {
		const input = baseInput({
			components: [component({ totalEcts: 162 })],
			declaredTotalEcts: 162,
			normativeEcts: 162,
			electiveBlocks: [
				{
					id: 'b1',
					name: 'Блок ВК 1',
					maxSelections: 1,
					optionEcts: [6, 6]
				}
			]
		})
		expect(codes(input)).not.toContain('ELECTIVE_BLOCK_OFFER_TOO_NARROW')
	})

	it('порожній вибірковий блок блокує', () => {
		const input = baseInput({
			electiveBlocks: [
				{
					id: 'b1',
					name: 'Порожній блок',
					maxSelections: 1,
					optionEcts: []
				}
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'ELECTIVE_BLOCK_EMPTY'
			)?.severity
		).toBe('BLOCK')
	})
})

// ─── Кредити і години ─────────────────────────────────────────────────────────

describe('кредити і години (Наказ МОН № 510, п. 9.3, 9.5)', () => {
	it('1 кредит ЄКТС = 30 годин', () => {
		expect(NORM_HOURS_PER_ECTS).toBe(30)
	})

	it('невідповідність годин кредитам блокує', () => {
		const input = baseInput({
			components: [
				component({ totalEcts: 162, totalHours: 4000 }),
				component({
					totalEcts: 18,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'COMPONENT_HOURS_ECTS_MISMATCH'
			)?.severity
		).toBe('BLOCK')
	})

	it('компоненти ЗСО з нульовими ЄКТС не перевіряються на 30 год/кредит', () => {
		const input = baseInput({
			components: [
				component({ totalEcts: 162 }),
				component({
					totalEcts: 18,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				}),
				component({
					totalEcts: 0,
					totalHours: 420,
					sectionType: 'SECONDARY_EDUCATION'
				})
			]
		})
		expect(codes(input)).not.toContain('COMPONENT_HOURS_ECTS_MISMATCH')
	})

	it('сума ЄКТС по семестрах має дорівнювати обсягу компонента', () => {
		const input = baseInput({
			components: [
				component({
					totalEcts: 162,
					terms: [
						{
							semesterNumber: 1,
							ects: 80,
							hours: 2400,
							controlForm: null,
							hasCourseWork: false,
							hasCourseProject: false
						}
					]
				}),
				component({
					totalEcts: 18,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'TERM_ECTS_SUM_MISMATCH'
			)?.severity
		).toBe('BLOCK')
	})

	it('понад 20 аудиторних годин на кредит — попередження', () => {
		const input = baseInput({
			components: [
				component({ totalEcts: 162, auditoryHours: 3500 }),
				component({
					totalEcts: 18,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'AUDITORY_HOURS_PER_ECTS_EXCEEDED'
			)?.severity
		).toBe('WARN')
	})

	it('сума годин за видами занять не може перевищувати аудиторні', () => {
		const input = baseInput({
			components: [
				component({
					totalEcts: 162,
					auditoryHours: 100,
					lectureHours: 80,
					practicalHours: 80
				}),
				component({
					totalEcts: 18,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'LESSON_HOURS_EXCEED_AUDITORY'
			)?.severity
		).toBe('BLOCK')
	})

	it('розподілені години не можуть перевищувати обсяг компонента', () => {
		const input = baseInput({
			components: [
				component({
					totalEcts: 6,
					auditoryHours: 120,
					selfStudyHours: 120
				}),
				component({
					totalEcts: 174,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'ALLOCATED_HOURS_EXCEED_TOTAL'
			)?.severity
		).toBe('BLOCK')
	})
})

// ─── Контрольні заходи ────────────────────────────────────────────────────────

describe('кредити під контрольні заходи (Наказ МОН № 510, п. 9.5)', () => {
	it('екзамен без зарезервованого кредиту — попередження', () => {
		const input = baseInput({
			components: [
				component({
					totalEcts: 0.5,
					totalHours: 15,
					terms: [
						{
							semesterNumber: 1,
							ects: 0.5,
							hours: 15,
							controlForm: 'EXAM',
							hasCourseWork: false,
							hasCourseProject: false
						}
					]
				}),
				component({
					totalEcts: 179.5,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'EXAM_ECTS_NOT_RESERVED'
			)?.severity
		).toBe('WARN')
	})

	it('курсова як окремий компонент — не менше 3 кредитів', () => {
		const input = baseInput({
			components: [
				component({
					totalEcts: 2,
					totalHours: 60,
					componentType: 'COURSE_WORK',
					terms: [
						{
							semesterNumber: 3,
							ects: 2,
							hours: 60,
							controlForm: null,
							hasCourseWork: true,
							hasCourseProject: false
						}
					]
				}),
				component({
					totalEcts: 178,
					isMandatory: false,
					sectionType: 'ELECTIVE'
				})
			]
		})
		const finding = validateCurriculumNorms(input).find(
			f => f.code === 'COURSE_WORK_ECTS_BELOW_MIN'
		)
		expect(finding?.severity).toBe('WARN')
		expect(finding?.message).toContain('3')
	})
})

// ─── Річне навантаження ───────────────────────────────────────────────────────

describe('річне навантаження (Наказ МОН № 510, п. 9.3)', () => {
	it('норма — 60 кредитів на рік', () => {
		expect(NORM_ECTS_PER_YEAR).toBe(60)
	})

	it('180 ЄКТС за 36 місяців = 60/рік — без зауважень', () => {
		expect(codes(baseInput())).not.toContain('ANNUAL_ECTS_OFF_NORM')
	})

	it('180 ЄКТС за 24 місяці = 90/рік — попередження', () => {
		const input = baseInput({ studyDurationMonths: 24 })
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'ANNUAL_ECTS_OFF_NORM'
			)?.severity
		).toBe('WARN')
	})

	it('для заочної форми норма 60/рік не застосовується', () => {
		const input = baseInput({
			studyDurationMonths: 24,
			educationForm: 'PART_TIME'
		})
		expect(codes(input)).not.toContain('ANNUAL_ECTS_OFF_NORM')
	})
})

// ─── Графік освітнього процесу ────────────────────────────────────────────────

describe('графік освітнього процесу (Наказ МОН № 510, п. 9.1, 9.2)', () => {
	function weeks(
		courseNumber: number,
		spec: { instruction: number; holiday: number; attestation?: number }
	) {
		return [
			...Array.from({ length: spec.instruction }, () => ({
				courseNumber,
				weekType: 'INSTRUCTION' as const
			})),
			...Array.from({ length: spec.holiday }, () => ({
				courseNumber,
				weekType: 'HOLIDAY' as const
			})),
			...Array.from({ length: spec.attestation ?? 0 }, () => ({
				courseNumber,
				weekType: 'STATE_ATTESTATION' as const
			}))
		]
	}

	it('порожній графік — попередження', () => {
		expect(
			validateCurriculumNorms(baseInput({ calendar: [] })).find(
				f => f.code === 'CALENDAR_EMPTY'
			)?.severity
		).toBe('WARN')
	})

	it('коректний рік: 40 тижнів навчання + 12 канікул = 52', () => {
		const input = baseInput({
			calendar: [
				...weeks(1, { instruction: 40, holiday: 12 }),
				...weeks(2, { instruction: 40, holiday: 12 })
			]
		})
		const found = codes(input)
		expect(found).not.toContain('HOLIDAY_WEEKS_BELOW_MIN')
		expect(found).not.toContain('INSTRUCTION_WEEKS_EXCEEDED')
		expect(found).not.toContain('ACADEMIC_YEAR_WEEKS_OFF_NORM')
	})

	it('менше 8 тижнів канікул блокує', () => {
		const input = baseInput({
			calendar: [
				...weeks(1, { instruction: 46, holiday: 6 }),
				...weeks(2, { instruction: 40, holiday: 12 })
			]
		})
		const findings = validateCurriculumNorms(input)
		expect(
			findings.find(f => f.code === 'HOLIDAY_WEEKS_BELOW_MIN')?.severity
		).toBe('BLOCK')
	})

	it('понад 40 тижнів навчання блокує', () => {
		const input = baseInput({
			calendar: [
				...weeks(1, { instruction: 44, holiday: 8 }),
				...weeks(2, { instruction: 40, holiday: 12 })
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'INSTRUCTION_WEEKS_EXCEEDED'
			)?.severity
		).toBe('BLOCK')
	})

	it('останній рік навчання коротший за 52 тижні — без зауважень', () => {
		const input = baseInput({
			calendar: [
				...weeks(1, { instruction: 40, holiday: 12 }),
				...weeks(2, { instruction: 20, holiday: 0 })
			]
		})
		const found = codes(input)
		expect(found).not.toContain('ACADEMIC_YEAR_WEEKS_OFF_NORM')
		expect(found).not.toContain('HOLIDAY_WEEKS_BELOW_MIN')
	})

	it('понад 4 тижні атестації — попередження', () => {
		const input = baseInput({
			calendar: [
				...weeks(1, { instruction: 38, holiday: 8, attestation: 6 }),
				...weeks(2, { instruction: 40, holiday: 12 })
			]
		})
		expect(
			validateCurriculumNorms(input).find(
				f => f.code === 'ATTESTATION_WEEKS_EXCEEDED'
			)?.severity
		).toBe('WARN')
	})
})

// ─── Бюджет часу ──────────────────────────────────────────────────────────────

describe('бюджет часу (Наказ МОН № 510, п. 9.4–9.5)', () => {
	it('порожня таблиця бюджету часу — попередження', () => {
		expect(
			validateCurriculumNorms(
				baseInput({ timeBudgetEntryCount: 0 })
			).find(f => f.code === 'TIME_BUDGET_EMPTY')?.severity
		).toBe('WARN')
	})

	it('заповнена таблиця бюджету часу зауважень не дає', () => {
		expect(codes(baseInput({ timeBudgetEntryCount: 5 }))).not.toContain(
			'TIME_BUDGET_EMPTY'
		)
	})
})

// ─── Кожна знахідка має посилання на джерело ──────────────────────────────────

describe('оформлення знахідок', () => {
	it('кожна знахідка посилається на конкретний пункт норми', () => {
		const findings = validateCurriculumNorms(
			baseInput({
				declaredTotalEcts: 150,
				normativeEcts: 180,
				timeBudgetEntryCount: 0
			})
		)
		expect(findings.length).toBeGreaterThan(0)
		for (const finding of findings) {
			expect(finding.source).toMatch(/Наказ|Закон|стандарт/)
			expect(finding.message.length).toBeGreaterThan(10)
			expect(['BLOCK', 'WARN']).toContain(finding.severity)
		}
	})
})
