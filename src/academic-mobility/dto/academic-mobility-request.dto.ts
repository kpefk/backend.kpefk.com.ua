import { MobilityDirection, NationalGrade } from '@prisma/client'
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

export class AcademicMobilityItemInputDto {
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

	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(12)
	finalGrade?: number | null

	@IsOptional()
	@IsEnum(NationalGrade)
	nationalGradeOverride?: NationalGrade

	/** Назва курсу в закладі-партнері (довідково). */
	@IsOptional()
	@IsString()
	@MaxLength(300)
	partnerComponentName?: string
}

export class CreateAcademicMobilityDto {
	@IsUUID('4')
	studentId!: string

	@IsEnum(MobilityDirection)
	direction!: MobilityDirection

	@IsString()
	@IsNotEmpty()
	@MaxLength(300)
	partnerInstitutionName!: string

	@IsOptional()
	@IsUUID('4')
	partnerUniversityId?: string

	@IsOptional()
	@IsString()
	@MaxLength(100)
	country?: string

	@IsISO8601()
	periodFrom!: string

	@IsISO8601()
	periodTo!: string

	@IsOptional()
	@IsString()
	@MaxLength(100)
	agreementNumber?: string

	@IsOptional()
	@IsISO8601()
	agreementDate?: string

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
	@Type(() => AcademicMobilityItemInputDto)
	items!: AcademicMobilityItemInputDto[]
}

export class UpdateAcademicMobilityDto {
	@IsOptional()
	@IsEnum(MobilityDirection)
	direction?: MobilityDirection

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(300)
	partnerInstitutionName?: string

	@IsOptional()
	@IsUUID('4')
	partnerUniversityId?: string | null

	@IsOptional()
	@IsString()
	@MaxLength(100)
	country?: string | null

	@IsOptional()
	@IsISO8601()
	periodFrom?: string

	@IsOptional()
	@IsISO8601()
	periodTo?: string

	@IsOptional()
	@IsString()
	@MaxLength(100)
	agreementNumber?: string | null

	@IsOptional()
	@IsISO8601()
	agreementDate?: string | null

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

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AcademicMobilityItemInputDto)
	items?: AcademicMobilityItemInputDto[]
}
