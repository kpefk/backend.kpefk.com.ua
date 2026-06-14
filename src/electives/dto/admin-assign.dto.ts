import { IsInt, IsString, Min } from 'class-validator'

export class AdminAssignDto {
  @IsString()
  studentId!: string

  @IsString()
  electiveId!: string

  @IsInt()
  @Min(1)
  semester!: number

  @IsString()
  academicYear!: string
}
