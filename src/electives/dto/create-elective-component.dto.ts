import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator'

export class CreateElectiveComponentDto {
  @IsString()
  @MaxLength(500)
  name!: string

  @IsString()
  @MaxLength(20)
  oppCode!: string

  @IsString()
  @MaxLength(200)
  oppName!: string

  @IsInt()
  @Min(1)
  semester!: number

  @IsInt()
  @Min(1)
  ectsCredits!: number

  @IsString()
  @MaxLength(200)
  cyclicComm!: string

  @IsOptional()
  @IsUrl()
  syllabusUrl?: string

  @IsString()
  @MaxLength(9)
  academicYear!: string // "2024-2025"

  @IsOptional()
  @IsBoolean()
  isHigherEd?: boolean
}
