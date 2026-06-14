import { IsEnum } from 'class-validator'
import { CatalogStatus } from '@prisma/client'

export class UpdateSeasonStatusDto {
  @IsEnum(CatalogStatus)
  catalogStatus!: CatalogStatus
}
