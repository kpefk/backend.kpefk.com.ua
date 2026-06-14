import { IsEnum } from 'class-validator'
import { CatalogStatus } from '@prisma/client'

export class UpdateCatalogStatusDto {
  @IsEnum(CatalogStatus)
  catalogStatus!: CatalogStatus
}
