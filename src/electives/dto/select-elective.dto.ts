import { IsInt, IsString, Min } from 'class-validator'

export class SelectElectiveDto {
  @IsString()
  electiveId!: string

  @IsInt()
  @Min(1)
  semester!: number

  @IsString()
  academicYear!: string
}
