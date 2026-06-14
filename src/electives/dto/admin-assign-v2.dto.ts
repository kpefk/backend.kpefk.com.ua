import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class AdminAssignV2Dto {
  @IsString()
  @IsNotEmpty()
  studentId!: string

  @IsString()
  @IsNotEmpty()
  seasonId!: string

  @IsString()
  @IsNotEmpty()
  componentId!: string

  @IsOptional()
  @IsString()
  overrideReason?: string
}
