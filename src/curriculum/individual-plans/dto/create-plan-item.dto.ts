import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator'
import { IndividualPlanDeviationType } from '@prisma/client'

export class CreatePlanItemDto {
  @IsUUID('4')
  @IsNotEmpty()
  componentId!: string

  @IsInt()
  @Min(1)
  semesterNumber!: number

  @IsEnum(IndividualPlanDeviationType)
  deviationType!: IndividualPlanDeviationType

  @IsOptional()
  @IsString()
  notes?: string
}
