import { IsEnum, IsOptional, IsString } from 'class-validator'
import { IndividualPlanDeviationType } from '@prisma/client'

export class UpdatePlanItemDto {
  @IsOptional()
  @IsEnum(IndividualPlanDeviationType)
  deviationType?: IndividualPlanDeviationType

  @IsOptional()
  @IsString()
  notes?: string
}
