import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from 'class-validator'

export class UpdateElectiveComponentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  oppCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  oppName?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  semester?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  ectsCredits?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cyclicComm?: string

  @IsOptional()
  @IsUrl()
  syllabusUrl?: string

  @IsOptional()
  @IsBoolean()
  isHigherEd?: boolean

  /** Прив'язка до CurriculumComponentTerm. null = зняти зв'язок. */
  @IsOptional()
  @IsUUID()
  curriculumTermId?: string | null
}
