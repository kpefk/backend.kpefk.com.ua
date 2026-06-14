import { IsDateString, IsOptional, IsString } from 'class-validator'

export class UpdateCampaignDto {
  @IsOptional()
  @IsDateString()
  selectionDeadline?: string

  @IsOptional()
  @IsDateString()
  lateDeadline?: string

  /// §2.4 — затвердження каталогу педагогічною радою
  @IsOptional()
  @IsDateString()
  pedagogicalCouncilDate?: string

  @IsOptional()
  @IsString()
  pedagogicalCouncilProtocolNumber?: string

  /// §2.4 — наказ директора про введення каталогу в дію
  @IsOptional()
  @IsString()
  directorOrderNumber?: string

  @IsOptional()
  @IsDateString()
  directorOrderDate?: string

  @IsOptional()
  @IsString()
  notes?: string
}
