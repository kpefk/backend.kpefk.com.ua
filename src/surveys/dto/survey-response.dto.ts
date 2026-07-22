import type { SurveyQuestionType, SurveyStatus } from '@prisma/client'

export class SurveyQuestionOptionDto {
	id!: string
	order!: number
	text!: string
}

export class SurveyQuestionDto {
	id!: string
	order!: number
	text!: string
	type!: SurveyQuestionType
	required!: boolean
	/** Варіанти для SINGLE_CHOICE / MULTI_CHOICE / DROPDOWN (інакше порожньо). */
	options!: SurveyQuestionOptionDto[]
	/** Налаштування лінійної шкали (SCALE). */
	scaleMin!: number | null
	scaleMax!: number | null
	scaleMinLabel!: string | null
	scaleMaxLabel!: string | null
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

export class SurveyOptionCountDto {
	optionId!: string
	text!: string
	count!: number
}

export class SurveyQuestionResultDto {
	questionId!: string
	order!: number
	text!: string
	type!: SurveyQuestionType
	answersCount!: number
	/** RATING/SCALE: середнє (null якщо відповідей немає). */
	ratingAverage!: number | null
	/** RATING: розподіл 1..5 (індекс 0 → 1). SCALE: розподіл scaleMin..scaleMax. */
	ratingDistribution!: number[] | null
	/** SCALE: межі шкали (для підпису розподілу). */
	scaleMin!: number | null
	scaleMax!: number | null
	/** SINGLE_CHOICE/MULTI_CHOICE/DROPDOWN: лічильник по варіантах. */
	optionCounts!: SurveyOptionCountDto[] | null
	/** TEXT/PARAGRAPH: відповіді без timestamps (захист анонімності від кореляції за часом). */
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
