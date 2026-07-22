import { GradeScale, NationalGrade, TermControlForm } from '@prisma/client'

export const UA_NUMBER_WORDS: Record<number, string> = {
	1: 'один',
	2: 'два',
	3: 'три',
	4: 'чотири',
	5: "п'ять",
	6: 'шість',
	7: 'сім',
	8: 'вісім',
	9: "дев'ять",
	10: 'десять',
	11: 'одинадцять',
	12: 'дванадцять'
}

export const NATIONAL_GRADE_WORDS: Record<string, string> = {
	[NationalGrade.EXCELLENT]: 'відмінно',
	[NationalGrade.GOOD]: 'добре',
	[NationalGrade.SATISFACTORY]: 'задовільно',
	[NationalGrade.UNSATISFACTORY]: 'незадовільно',
	[NationalGrade.PASSED]: 'зараховано',
	[NationalGrade.NOT_PASSED]: 'не зараховано'
}

export const ROMAN_NUMERALS: Record<number, string> = {
	1: 'I',
	2: 'II',
	3: 'III',
	4: 'IV',
	5: 'V',
	6: 'VI',
	7: 'VII',
	8: 'VIII',
	9: 'IX',
	10: 'X'
}

export const UA_MONTHS_GENITIVE = [
	'січня',
	'лютого',
	'березня',
	'квітня',
	'травня',
	'червня',
	'липня',
	'серпня',
	'вересня',
	'жовтня',
	'листопада',
	'грудня'
] as const

export const VIDOMIST_SUBTITLE: Record<string, string> = {
	[TermControlForm.EXAM]: 'СЕМЕСТРОВИХ ОЦІНОК',
	[TermControlForm.CREDIT]: 'СЕМЕСТРОВИХ ОЦІНОК',
	[TermControlForm.GRADED_CREDIT]: 'СЕМЕСТРОВИХ ОЦІНОК'
}

export function formatGradeText(
	grade: number,
	scale: GradeScale,
	nationalGrade: NationalGrade
): string {
	if (scale === GradeScale.TWELVE_POINT) {
		return `${grade} (${UA_NUMBER_WORDS[grade] ?? String(grade)})`
	}
	return `${grade} (${NATIONAL_GRADE_WORDS[nationalGrade] ?? ''})`
}

export function formatCreditText(nationalGrade: NationalGrade): string {
	return NATIONAL_GRADE_WORDS[nationalGrade] ?? ''
}

interface GradeStats {
	ranges: Array<{ label: string; count: number; percent: string }>
	average: string
	qualityPercent: string
}

export function computeGradeStats(
	grades: number[],
	scale: GradeScale
): GradeStats {
	const total = grades.length

	if (total === 0) {
		const ranges =
			scale === GradeScale.TWELVE_POINT
				? ['10-12', '7-9', '4-6', '1-3']
				: ['5', '4', '3', '2']
		return {
			ranges: ranges.map(label => ({ label, count: 0, percent: '—' })),
			average: '—',
			qualityPercent: '—'
		}
	}

	if (scale === GradeScale.TWELVE_POINT) {
		const r1012 = grades.filter(g => g >= 10).length
		const r79 = grades.filter(g => g >= 7 && g <= 9).length
		const r46 = grades.filter(g => g >= 4 && g <= 6).length
		const r13 = grades.filter(g => g >= 1 && g <= 3).length
		const qualityCount = grades.filter(g => g >= 7).length

		return {
			ranges: [
				{
					label: '10-12',
					count: r1012,
					percent: formatPercent(r1012, total)
				},
				{
					label: '7-9',
					count: r79,
					percent: formatPercent(r79, total)
				},
				{
					label: '4-6',
					count: r46,
					percent: formatPercent(r46, total)
				},
				{ label: '1-3', count: r13, percent: formatPercent(r13, total) }
			],
			average: formatAverage(grades),
			qualityPercent: formatPercent(qualityCount, total)
		}
	}

	const r5 = grades.filter(g => g === 5).length
	const r4 = grades.filter(g => g === 4).length
	const r3 = grades.filter(g => g === 3).length
	const r2 = grades.filter(g => g <= 2).length
	const qualityCount = grades.filter(g => g >= 4).length

	return {
		ranges: [
			{ label: '5', count: r5, percent: formatPercent(r5, total) },
			{ label: '4', count: r4, percent: formatPercent(r4, total) },
			{ label: '3', count: r3, percent: formatPercent(r3, total) },
			{ label: '2', count: r2, percent: formatPercent(r2, total) }
		],
		average: formatAverage(grades),
		qualityPercent: formatPercent(qualityCount, total)
	}
}

function formatPercent(count: number, total: number): string {
	if (count === 0) return '—'
	const pct = (count / total) * 100
	return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`
}

function formatAverage(grades: number[]): string {
	const sum = grades.reduce((a, b) => a + b, 0)
	const avg = sum / grades.length
	return avg % 1 === 0 ? String(avg) : avg.toFixed(1).replace('.', ',')
}
