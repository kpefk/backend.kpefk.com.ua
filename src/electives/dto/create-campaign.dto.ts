import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'

export class CreateCampaignDto {
  /// Цільовий навчальний рік, НА який здійснюється вибір ("2026-2027")
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{4}$/, { message: 'academicYear має бути у форматі "2026-2027"' })
  academicYear!: string

  @IsOptional()
  @IsDateString()
  selectionDeadline?: string

  @IsOptional()
  @IsDateString()
  lateDeadline?: string

  @IsOptional()
  @IsString()
  notes?: string
}
