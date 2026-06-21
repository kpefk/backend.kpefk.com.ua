import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateIndividualPlanDto {
  @IsUUID('4')
  @IsNotEmpty()
  studentId!: string

  @IsUUID('4')
  @IsNotEmpty()
  assignmentId!: string

  @IsOptional()
  @IsString()
  notes?: string
}
