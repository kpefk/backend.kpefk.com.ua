import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import { SurveyQuestionType, SurveyStatus } from '@prisma/client'

import {
  SURVEY_MAX_QUESTIONS,
  SURVEY_RATING_MAX,
  SURVEY_RATING_MIN,
  SURVEY_TEXT_ANSWER_MAX_LENGTH,
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

  @IsOptional()
  @IsInt()
  @Min(SURVEY_RATING_MIN)
  @Max(SURVEY_RATING_MAX)
  ratingValue?: number

  @IsOptional()
  @IsBoolean()
  boolValue?: boolean

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
