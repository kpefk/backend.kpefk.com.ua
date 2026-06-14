import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateQualificationUpgradeDto {
  @IsString()
  @MaxLength(500)
  courseName!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  organizationName?: string

  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string

  /// Обсяг у годинах. Наказ МОН: загальний обсяг за 5 років — не менше 120 год.
  @IsInt()
  @Min(1)
  hours!: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  certificateNumber?: string

}
