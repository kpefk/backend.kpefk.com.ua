import type { SurveyQuestionType } from '@prisma/client'

import { SURVEY_RATING_MAX, SURVEY_RATING_MIN } from './surveys.constants'
import type { SurveyQuestionResultDto } from './dto/survey-response.dto'

export interface QuestionRow {
  id: string
  order: number
  text: string
  type: SurveyQuestionType
}

export interface AnswerRow {
  questionId: string
  ratingValue: number | null
  boolValue: boolean | null
  textValue: string | null
}

/**
 * Агрегує відповіді по питаннях кампанії. Чиста функція (unit-тестується без БД).
 * Текстові відповіді повертаються в порядку id (без timestamps) — захист анонімних
 * кампаній від деанонімізації кореляцією за часом.
 */
export function computeQuestionResults(
  questions: QuestionRow[],
  answers: AnswerRow[],
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

  return questions.map((q) => {
    const qa = byQuestion.get(q.id) ?? []

    let ratingAverage: number | null = null
    let ratingDistribution: number[] | null = null
    let yesCount: number | null = null
    let noCount: number | null = null
    let textAnswers: string[] | null = null

    if (q.type === 'RATING') {
      const values = qa
        .map((a) => a.ratingValue)
        .filter((v): v is number => v !== null && v >= SURVEY_RATING_MIN && v <= SURVEY_RATING_MAX)
      ratingDistribution = Array.from(
        { length: SURVEY_RATING_MAX - SURVEY_RATING_MIN + 1 },
        () => 0,
      )
      for (const v of values) ratingDistribution[v - SURVEY_RATING_MIN]++
      ratingAverage = values.length > 0
        ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
        : null
    } else if (q.type === 'YES_NO') {
      yesCount = qa.filter((a) => a.boolValue === true).length
      noCount = qa.filter((a) => a.boolValue === false).length
    } else {
      textAnswers = qa
        .map((a) => a.textValue)
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
      yesCount,
      noCount,
      textAnswers,
    }
  })
}

/** Response rate у відсотках (0..100, ціле). 0 цілей → 0. */
export function computeResponseRatePercent(targets: number, completions: number): number {
  if (targets <= 0) return 0
  return Math.round((completions / targets) * 100)
}
