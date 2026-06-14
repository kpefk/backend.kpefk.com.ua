import { CatalogStatus } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdateCampaignStatusDto {
  @IsEnum(CatalogStatus)
  status!: CatalogStatus
}
