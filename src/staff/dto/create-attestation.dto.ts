import { AttestationType } from '@prisma/client'
import {
	IsBoolean,
	IsDateString,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength
} from 'class-validator'

export class CreateAttestationDto {
	@IsDateString()
	attestationDate!: string

	@IsEnum(AttestationType)
	type!: AttestationType

	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	resultCategory!: string

	@IsOptional()
	@IsString()
	@MaxLength(200)
	resultTitle?: string

	@IsOptional()
	@IsBoolean()
	correspondsToPosition?: boolean

	@IsOptional()
	@IsString()
	@MaxLength(100)
	orderNumber?: string

	@IsOptional()
	@IsDateString()
	orderDate?: string

	/** Якщо не задано — обчислюється як attestationDate + 5 років. */
	@IsOptional()
	@IsDateString()
	nextAttestationDate?: string

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	notes?: string
}
