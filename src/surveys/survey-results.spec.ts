/**
 * Unit tests for survey-results — агрегація відповідей опитувань (ВСЗЯО).
 *
 * Pure functions, no Prisma/DB required.
 * Run: npx jest survey-results.spec.ts
 */
import {
	type AnswerRow,
	computeQuestionResults,
	computeResponseRatePercent,
	type QuestionRow
} from './survey-results'

const Q_RATING: QuestionRow = {
	id: 'q1',
	order: 1,
	text: 'Оцініть якість',
	type: 'RATING',
	options: [],
	scaleMin: null,
	scaleMax: null
}
const Q_TEXT: QuestionRow = {
	id: 'q3',
	order: 3,
	text: 'Коментар',
	type: 'TEXT',
	options: [],
	scaleMin: null,
	scaleMax: null
}
const Q_SINGLE: QuestionRow = {
	id: 'q4',
	order: 4,
	text: 'Оберіть варіант',
	type: 'SINGLE_CHOICE',
	options: [
		{ id: 'o1', order: 0, text: 'Так' },
		{ id: 'o2', order: 1, text: 'Ні' }
	],
	scaleMin: null,
	scaleMax: null
}
const Q_MULTI: QuestionRow = {
	id: 'q5',
	order: 5,
	text: 'Що покращити',
	type: 'MULTI_CHOICE',
	options: [
		{ id: 'm1', order: 0, text: 'Практика' },
		{ id: 'm2', order: 1, text: 'Лекції' },
		{ id: 'm3', order: 2, text: 'Матеріали' }
	],
	scaleMin: null,
	scaleMax: null
}
const Q_SCALE: QuestionRow = {
	id: 'q6',
	order: 6,
	text: 'Наскільки ймовірно',
	type: 'SCALE',
	options: [],
	scaleMin: 1,
	scaleMax: 3
}

function rating(questionId: string, v: number): AnswerRow {
	return {
		questionId,
		ratingValue: v,
		textValue: null,
		selectedOptionIds: []
	}
}
function text(questionId: string, v: string): AnswerRow {
	return {
		questionId,
		ratingValue: null,
		textValue: v,
		selectedOptionIds: []
	}
}
function choice(questionId: string, ...optionIds: string[]): AnswerRow {
	return {
		questionId,
		ratingValue: null,
		textValue: null,
		selectedOptionIds: optionIds
	}
}

describe('computeQuestionResults', () => {
	it('RATING: середнє + розподіл 1..5', () => {
		const [r] = computeQuestionResults(
			[Q_RATING],
			[rating('q1', 5), rating('q1', 4), rating('q1', 4), rating('q1', 1)]
		)
		expect(r.answersCount).toBe(4)
		expect(r.ratingAverage).toBeCloseTo(3.5)
		// індекс 0 → оцінка 1, індекс 4 → оцінка 5
		expect(r.ratingDistribution).toEqual([1, 0, 0, 2, 1])
		expect(r.optionCounts).toBeNull()
		expect(r.textAnswers).toBeNull()
	})

	it('RATING без відповідей: average = null, розподіл нульовий', () => {
		const [r] = computeQuestionResults([Q_RATING], [])
		expect(r.answersCount).toBe(0)
		expect(r.ratingAverage).toBeNull()
		expect(r.ratingDistribution).toEqual([0, 0, 0, 0, 0])
	})

	it('SINGLE_CHOICE: лічильник по варіантах', () => {
		const [r] = computeQuestionResults(
			[Q_SINGLE],
			[choice('q4', 'o1'), choice('q4', 'o1'), choice('q4', 'o2')]
		)
		expect(r.optionCounts).toEqual([
			{ optionId: 'o1', text: 'Так', count: 2 },
			{ optionId: 'o2', text: 'Ні', count: 1 }
		])
		expect(r.ratingAverage).toBeNull()
	})

	it('MULTI_CHOICE: сума входжень може перевищувати кількість респондентів', () => {
		const [r] = computeQuestionResults(
			[Q_MULTI],
			[choice('q5', 'm1', 'm2'), choice('q5', 'm1', 'm3')]
		)
		expect(r.answersCount).toBe(2)
		expect(r.optionCounts).toEqual([
			{ optionId: 'm1', text: 'Практика', count: 2 },
			{ optionId: 'm2', text: 'Лекції', count: 1 },
			{ optionId: 'm3', text: 'Матеріали', count: 1 }
		])
	})

	it('SCALE: розподіл scaleMin..scaleMax + середнє', () => {
		const [r] = computeQuestionResults(
			[Q_SCALE],
			[rating('q6', 1), rating('q6', 3), rating('q6', 3)]
		)
		expect(r.scaleMin).toBe(1)
		expect(r.scaleMax).toBe(3)
		// розподіл 1..3 → [1, 0, 2]
		expect(r.ratingDistribution).toEqual([1, 0, 2])
		expect(r.ratingAverage).toBeCloseTo(2.33)
	})

	it('TEXT: збирає непорожні відповіді', () => {
		const [r] = computeQuestionResults(
			[Q_TEXT],
			[
				text('q3', 'Все добре'),
				text('q3', '   '),
				text('q3', 'Більше практики')
			]
		)
		expect(r.textAnswers).toEqual(['Все добре', 'Більше практики'])
		expect(r.answersCount).toBe(3)
	})

	it('відповіді на чужі питання не змішуються', () => {
		const results = computeQuestionResults(
			[Q_RATING, Q_SINGLE],
			[rating('q1', 3), choice('q4', 'o1')]
		)
		expect(results[0].answersCount).toBe(1)
		expect(results[1].answersCount).toBe(1)
	})
})

describe('computeResponseRatePercent', () => {
	it('звичайний випадок', () => {
		expect(computeResponseRatePercent(20, 15)).toBe(75)
	})

	it('0 цільових студентів → 0', () => {
		expect(computeResponseRatePercent(0, 5)).toBe(0)
	})

	it('усі пройшли → 100', () => {
		expect(computeResponseRatePercent(10, 10)).toBe(100)
	})
})
