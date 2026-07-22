import { IndividualPlanDeviationType } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class UpdatePlanItemDto {
	@IsOptional()
	@IsEnum(IndividualPlanDeviationType)
	deviationType?: IndividualPlanDeviationType

	@IsOptional()
	@IsString()
	notes?: string
}
