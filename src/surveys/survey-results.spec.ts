/**
 * Unit tests for survey-results — агрегація відповідей опитувань (ВСЗЯО).
 *
 * Pure functions, no Prisma/DB required.
 * Run: npx jest survey-results.spec.ts
 */
import {
  computeQuestionResults,
  computeResponseRatePercent,
  type AnswerRow,
  type QuestionRow,
} from './survey-results'

const Q_RATING: QuestionRow = { id: 'q1', order: 1, text: 'Оцініть якість', type: 'RATING' }
const Q_YESNO: QuestionRow = { id: 'q2', order: 2, text: 'Чи задоволені?', type: 'YES_NO' }
const Q_TEXT: QuestionRow = { id: 'q3', order: 3, text: 'Коментар', type: 'TEXT' }

function rating(questionId: string, v: number): AnswerRow {
  return { questionId, ratingValue: v, boolValue: null, textValue: null }
}
function yesNo(questionId: string, v: boolean): AnswerRow {
  return { questionId, ratingValue: null, boolValue: v, textValue: null }
}
function text(questionId: string, v: string): AnswerRow {
  return { questionId, ratingValue: null, boolValue: null, textValue: v }
}

describe('computeQuestionResults', () => {
  it('RATING: середнє + розподіл 1..5', () => {
    const [r] = computeQuestionResults(
      [Q_RATING],
      [rating('q1', 5), rating('q1', 4), rating('q1', 4), rating('q1', 1)],
    )
    expect(r.answersCount).toBe(4)
    expect(r.ratingAverage).toBeCloseTo(3.5)
    // індекс 0 → оцінка 1, індекс 4 → оцінка 5
    expect(r.ratingDistribution).toEqual([1, 0, 0, 2, 1])
    expect(r.yesCount).toBeNull()
    expect(r.textAnswers).toBeNull()
  })

  it('RATING без відповідей: average = null, розподіл нульовий', () => {
    const [r] = computeQuestionResults([Q_RATING], [])
    expect(r.answersCount).toBe(0)
    expect(r.ratingAverage).toBeNull()
    expect(r.ratingDistribution).toEqual([0, 0, 0, 0, 0])
  })

  it('YES_NO: рахує так/ні окремо', () => {
    const [r] = computeQuestionResults(
      [Q_YESNO],
      [yesNo('q2', true), yesNo('q2', true), yesNo('q2', false)],
    )
    expect(r.yesCount).toBe(2)
    expect(r.noCount).toBe(1)
    expect(r.ratingAverage).toBeNull()
  })

  it('TEXT: збирає непорожні відповіді', () => {
    const [r] = computeQuestionResults(
      [Q_TEXT],
      [text('q3', 'Все добре'), text('q3', '   '), text('q3', 'Більше практики')],
    )
    expect(r.textAnswers).toEqual(['Все добре', 'Більше практики'])
    expect(r.answersCount).toBe(3)
  })

  it('відповіді на чужі питання не змішуються', () => {
    const results = computeQuestionResults(
      [Q_RATING, Q_YESNO],
      [rating('q1', 3), yesNo('q2', true)],
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
