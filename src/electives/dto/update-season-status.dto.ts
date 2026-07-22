import { CatalogStatus } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdateSeasonStatusDto {
	@IsEnum(CatalogStatus)
	catalogStatus!: CatalogStatus
}
