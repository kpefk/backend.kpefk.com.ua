import { SurveyQuestionType, SurveyStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsISO8601,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	MaxLength,
	Min,
	ValidateNested
} from 'class-validator'

import {
	SCALE_MAX_ALLOWED,
	SCALE_MIN_ALLOWED,
	SURVEY_MAX_OPTIONS,
	SURVEY_MAX_QUESTIONS,
	SURVEY_RATING_MIN,
	SURVEY_TEXT_ANSWER_MAX_LENGTH
} from '../surveys.constants'

export class CreateSurveyDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(300)
	title!: string

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	description?: string

	@IsOptional()
	@IsBoolean()
	isAnonymous?: boolean

	@IsOptional()
	@IsISO8601()
	opensAt?: string

	@IsOptional()
	@IsISO8601()
	closesAt?: string

	/** Порожньо/відсутнє = адресовано всім студентам. */
	@IsOptional()
	@IsArray()
	@IsUUID('4', { each: true })
	groupIds?: string[]
}

export class UpdateSurveyDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(300)
	title?: string

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	description?: string

	@IsOptional()
	@IsBoolean()
	isAnonymous?: boolean

	@IsOptional()
	@IsISO8601()
	opensAt?: string | null

	@IsOptional()
	@IsISO8601()
	closesAt?: string | null

	/** Якщо передано — повністю замінює набір цільових груп. */
	@IsOptional()
	@IsArray()
	@IsUUID('4', { each: true })
	groupIds?: string[]
}

export class SurveyQuestionInputDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	text!: string

	@IsEnum(SurveyQuestionType)
	type!: SurveyQuestionType

	@IsOptional()
	@IsBoolean()
	required?: boolean

	/** Варіанти для SINGLE_CHOICE / MULTI_CHOICE / DROPDOWN (текст, порядок = індекс). */
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(SURVEY_MAX_OPTIONS)
	@IsString({ each: true })
	@MaxLength(500, { each: true })
	options?: string[]

	/** Лінійна шкала (SCALE). */
	@IsOptional()
	@IsInt()
	@Min(SCALE_MIN_ALLOWED)
	@Max(SCALE_MAX_ALLOWED)
	scaleMin?: number

	@IsOptional()
	@IsInt()
	@Min(SCALE_MIN_ALLOWED)
	@Max(SCALE_MAX_ALLOWED)
	scaleMax?: number

	@IsOptional()
	@IsString()
	@MaxLength(100)
	scaleMinLabel?: string

	@IsOptional()
	@IsString()
	@MaxLength(100)
	scaleMaxLabel?: string
}

export class SetSurveyQuestionsDto {
	@IsArray()
	@ArrayMaxSize(SURVEY_MAX_QUESTIONS)
	@ValidateNested({ each: true })
	@Type(() => SurveyQuestionInputDto)
	questions!: SurveyQuestionInputDto[]
}

export class SetSurveyStatusDto {
	@IsEnum(SurveyStatus)
	status!: SurveyStatus
}

export class SubmitAnswerDto {
	@IsUUID('4')
	questionId!: string

	/** RATING (1..5) або SCALE (у межах питання; точна перевірка — в сервісі). */
	@IsOptional()
	@IsInt()
	@Min(SURVEY_RATING_MIN)
	@Max(SCALE_MAX_ALLOWED)
	ratingValue?: number

	/** SINGLE_CHOICE/DROPDOWN (1 елемент) або MULTI_CHOICE (N). */
	@IsOptional()
	@IsArray()
	@IsUUID('4', { each: true })
	selectedOptionIds?: string[]

	@IsOptional()
	@IsString()
	@MaxLength(SURVEY_TEXT_ANSWER_MAX_LENGTH)
	textValue?: string
}

export class SubmitSurveyDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SubmitAnswerDto)
	answers!: SubmitAnswerDto[]
}
