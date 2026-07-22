import type { SurveyQuestionType } from '@prisma/client'

import type { SurveyQuestionResultDto } from './dto/survey-response.dto'
import { SURVEY_RATING_MAX, SURVEY_RATING_MIN } from './surveys.constants'

export interface QuestionOption {
	id: string
	order: number
	text: string
}

export interface QuestionRow {
	id: string
	order: number
	text: string
	type: SurveyQuestionType
	options: QuestionOption[]
	scaleMin: number | null
	scaleMax: number | null
}

export interface AnswerRow {
	questionId: string
	ratingValue: number | null
	textValue: string | null
	selectedOptionIds: string[]
}

const CHOICE_TYPES: readonly SurveyQuestionType[] = [
	'SINGLE_CHOICE',
	'MULTI_CHOICE',
	'DROPDOWN'
]

/**
 * Агрегує відповіді по питаннях кампанії. Чиста функція (unit-тестується без БД).
 * Текстові відповіді повертаються в порядку id (без timestamps) — захист анонімних
 * кампаній від деанонімізації кореляцією за часом.
 */
export function computeQuestionResults(
	questions: QuestionRow[],
	answers: AnswerRow[]
): SurveyQuestionResultDto[] {
	const byQuestion = new Map<string, AnswerRow[]>()
	for (const a of answers) {
		let list = byQuestion.get(a.questionId)
		if (!list) {
			list = []
			byQuestion.set(a.questionId, list)
		}
		list.push(a)
	}

	return questions.map(q => {
		const qa = byQuestion.get(q.id) ?? []

		let ratingAverage: number | null = null
		let ratingDistribution: number[] | null = null
		let scaleMin: number | null = null
		let scaleMax: number | null = null
		let optionCounts: SurveyQuestionResultDto['optionCounts'] = null
		let textAnswers: string[] | null = null

		if (q.type === 'RATING') {
			;[ratingAverage, ratingDistribution] = aggregateNumeric(
				qa,
				SURVEY_RATING_MIN,
				SURVEY_RATING_MAX
			)
		} else if (q.type === 'SCALE') {
			const min = q.scaleMin ?? 1
			const max = q.scaleMax ?? 5
			scaleMin = min
			scaleMax = max
			;[ratingAverage, ratingDistribution] = aggregateNumeric(
				qa,
				min,
				max
			)
		} else if (CHOICE_TYPES.includes(q.type)) {
			// Лічильник входжень кожного варіанта (для MULTI_CHOICE сума може перевищувати
			// кількість респондентів).
			const counts = new Map<string, number>()
			for (const a of qa) {
				for (const optId of a.selectedOptionIds) {
					counts.set(optId, (counts.get(optId) ?? 0) + 1)
				}
			}
			optionCounts = q.options.map(o => ({
				optionId: o.id,
				text: o.text,
				count: counts.get(o.id) ?? 0
			}))
		} else {
			// TEXT / PARAGRAPH
			textAnswers = qa
				.map(a => a.textValue)
				.filter((t): t is string => t !== null && t.trim() !== '')
		}

		return {
			questionId: q.id,
			order: q.order,
			text: q.text,
			type: q.type,
			answersCount: qa.length,
			ratingAverage,
			ratingDistribution,
			scaleMin,
			scaleMax,
			optionCounts,
			textAnswers
		}
	})
}

/** Середнє + розподіл для числових питань (RATING/SCALE) у діапазоні [min, max]. */
function aggregateNumeric(
	answers: AnswerRow[],
	min: number,
	max: number
): [number | null, number[]] {
	const values = answers
		.map(a => a.ratingValue)
		.filter((v): v is number => v !== null && v >= min && v <= max)
	const distribution = Array.from({ length: max - min + 1 }, () => 0)
	for (const v of values) distribution[v - min]++
	const average =
		values.length > 0
			? Math.round(
					(values.reduce((s, v) => s + v, 0) / values.length) * 100
				) / 100
			: null
	return [average, distribution]
}

/** Response rate у відсотках (0..100, ціле). 0 цілей → 0. */
export function computeResponseRatePercent(
	targets: number,
	completions: number
): number {
	if (targets <= 0) return 0
	return Math.round((completions / targets) * 100)
}
