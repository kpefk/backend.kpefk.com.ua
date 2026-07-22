import { NationalGrade } from '@prisma/client'
import { Type } from 'class-transformer'
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min,
	ValidateNested
} from 'class-validator'

import { TWELVE_POINT_MAX, TWELVE_POINT_MIN } from '../grades.constants'

export class CreateSemesterGradeDto {
	@IsUUID('4')
	studentId!: string

	@IsUUID('4')
	curriculumComponentTermId!: string

	@IsString()
	academicYear!: string

	@IsOptional()
	@IsInt()
	@Min(TWELVE_POINT_MIN)
	@Max(TWELVE_POINT_MAX)
	finalGrade?: number | null

	/** Для CREDIT: викладач обирає PASSED або NOT_PASSED напряму. */
	@IsOptional()
	@IsEnum(NationalGrade)
	nationalGradeOverride?: NationalGrade

	@IsOptional()
	@IsBoolean()
	isRetake?: boolean
}

export class StudentGradeInputDto {
	@IsUUID('4')
	studentId!: string

	@IsOptional()
	@IsInt()
	@Min(TWELVE_POINT_MIN)
	@Max(TWELVE_POINT_MAX)
	finalGrade?: number | null

	@IsOptional()
	@IsEnum(NationalGrade)
	nationalGradeOverride?: NationalGrade
}

export class BulkGradeEntryDto {
	@IsUUID('4')
	curriculumComponentTermId!: string

	@IsUUID('4')
	groupId!: string

	@IsString()
	academicYear!: string

	@IsArray()
	@ArrayMaxSize(500)
	@ValidateNested({ each: true })
	@Type(() => StudentGradeInputDto)
	grades!: StudentGradeInputDto[]
}
