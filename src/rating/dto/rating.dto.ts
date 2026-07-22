import type { GradeScale } from '@prisma/client'
import { Type } from 'class-transformer'
import {
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	MaxLength,
	Min
} from 'class-validator'

// ─── Requests ─────────────────────────────────────────────────────────────────

export class GroupRatingQueryDto {
	@IsString()
	@IsNotEmpty()
	academicYear!: string

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(8)
	semesterNumber!: number
}

export class SetRatingBonusDto {
	@IsUUID('4')
	studentId!: string

	@IsString()
	@IsNotEmpty()
	academicYear!: string

	@IsInt()
	@Min(1)
	@Max(8)
	semesterNumber!: number

	@IsNumber()
	@Min(0)
	@Max(100)
	points!: number

	@IsOptional()
	@IsString()
	@MaxLength(500)
	reason?: string
}

// ─── Responses ────────────────────────────────────────────────────────────────

export class RatingDisciplineDto {
	componentName!: string
	componentCode!: string | null
	grade!: number
	gradeScale!: GradeScale
	/** Нормалізована до 100-бальної (2 знаки). */
	normalized!: number
}

export class RatingRowDto {
	studentId!: string
	fullName!: string
	/** ЄДЕБО-значення джерела фінансування; null = ще не синхронізовано. */
	paymentTypeName!: string | null
	isBudget!: boolean
	disciplines!: RatingDisciplineDto[]
	/** Середній нормалізований бал (100-бальна, 2 знаки); null = немає оцінок. */
	averageScore!: number | null
	bonusPoints!: number
	bonusReason!: string | null
	/** averageScore + bonusPoints; null для контрактників та без оцінок. */
	totalScore!: number | null
	/** Ранг серед бюджетників групи (Excel RANK); null для контрактників/без оцінок. */
	rank!: number | null
}

export class GroupRatingDto {
	groupId!: string
	groupName!: string
	academicYear!: string
	semesterNumber!: number
	budgetCount!: number
	rows!: RatingRowDto[]
}
