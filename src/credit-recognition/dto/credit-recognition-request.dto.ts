import { CreditRecognitionType, NationalGrade } from '@prisma/client'
import { Type } from 'class-transformer'
import {
	ArrayMinSize,
	IsArray,
	IsEnum,
	IsInt,
	IsISO8601,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	MaxLength,
	Min,
	ValidateNested
} from 'class-validator'

export class CreditRecognitionItemInputDto {
	@IsUUID('4')
	curriculumComponentTermId!: string

	@IsString()
	@IsNotEmpty()
	@MaxLength(20)
	academicYear!: string

	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0)
	@Max(999)
	creditsEcts!: number

	/** Числова оцінка (у шкалі цільового компонента); null/відсутня для заліку (CREDIT). */
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(12)
	finalGrade?: number | null

	/** Для CREDIT — PASSED/NOT_PASSED. */
	@IsOptional()
	@IsEnum(NationalGrade)
	nationalGradeOverride?: NationalGrade
}

export class CreateCreditRecognitionDto {
	@IsUUID('4')
	studentId!: string

	@IsEnum(CreditRecognitionType)
	type!: CreditRecognitionType

	@IsString()
	@IsNotEmpty()
	@MaxLength(300)
	sourceInstitutionName!: string

	@IsOptional()
	@IsUUID('4')
	sourceUniversityId?: string

	@IsOptional()
	@IsString()
	@MaxLength(300)
	sourceDocument?: string

	@IsOptional()
	@IsISO8601()
	sourceDocumentDate?: string

	@IsOptional()
	@IsString()
	@MaxLength(100)
	protocolNumber?: string

	@IsOptional()
	@IsISO8601()
	protocolDate?: string

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	notes?: string

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreditRecognitionItemInputDto)
	items!: CreditRecognitionItemInputDto[]
}

export class UpdateCreditRecognitionDto {
	@IsOptional()
	@IsEnum(CreditRecognitionType)
	type?: CreditRecognitionType

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(300)
	sourceInstitutionName?: string

	@IsOptional()
	@IsUUID('4')
	sourceUniversityId?: string | null

	@IsOptional()
	@IsString()
	@MaxLength(300)
	sourceDocument?: string | null

	@IsOptional()
	@IsISO8601()
	sourceDocumentDate?: string | null

	@IsOptional()
	@IsString()
	@MaxLength(100)
	protocolNumber?: string | null

	@IsOptional()
	@IsISO8601()
	protocolDate?: string | null

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	notes?: string | null

	/** Якщо передано — повністю замінює набір перезарахованих компонентів (лише DRAFT). */
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreditRecognitionItemInputDto)
	items?: CreditRecognitionItemInputDto[]
}
