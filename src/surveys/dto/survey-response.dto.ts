import type { SurveyQuestionType, SurveyStatus } from '@prisma/client'

export class SurveyQuestionDto {
  id!: string
  order!: number
  text!: string
  type!: SurveyQuestionType
  required!: boolean
}

export class SurveyTargetGroupDto {
  groupId!: string
  groupName!: string
}

/** Кампанія для адмін-списку/деталей. */
export class SurveyAdminDto {
  id!: string
  title!: string
  description!: string | null
  status!: SurveyStatus
  isAnonymous!: boolean
  opensAt!: string | null
  closesAt!: string | null
  questionCount!: number
  completionCount!: number
  targetGroups!: SurveyTargetGroupDto[]
  questions!: SurveyQuestionDto[]
  createdAt!: string
}

/** Кампанія очима студента (включно з питаннями для форми проходження). */
export class StudentSurveyDto {
  id!: string
  title!: string
  description!: string | null
  isAnonymous!: boolean
  closesAt!: string | null
  completed!: boolean
  questions!: SurveyQuestionDto[]
}

export class SurveyGroupRateDto {
  groupId!: string
  groupName!: string
  targets!: number
  completions!: number
}

export class SurveyQuestionResultDto {
  questionId!: string
  order!: number
  text!: string
  type!: SurveyQuestionType
  answersCount!: number
  /** RATING: середнє (null якщо відповідей немає). */
  ratingAverage!: number | null
  /** RATING: розподіл — індекс 0 → оцінка 1, ... індекс 4 → оцінка 5. */
  ratingDistribution!: number[] | null
  /** YES_NO */
  yesCount!: number | null
  noCount!: number | null
  /** TEXT: відповіді без timestamps (захист анонімності від кореляції за часом). */
  textAnswers!: string[] | null
}

export class SurveyResultsDto {
  surveyId!: string
  title!: string
  isAnonymous!: boolean
  status!: SurveyStatus
  totalTargets!: number
  totalCompletions!: number
  /** 0..100, ціле. */
  responseRatePercent!: number
  /** Порожньо, якщо кампанія адресована всій установі. */
  byGroup!: SurveyGroupRateDto[]
  questions!: SurveyQuestionResultDto[]
}
