import { IsString, Matches } from 'class-validator'

const YEAR_PATTERN = /^\d{4}-\d{4}$/

export class CloneElectiveCatalogDto {
  @IsString()
  @Matches(YEAR_PATTERN, { message: 'sourceYear must be in format YYYY-YYYY' })
  sourceYear!: string

  @IsString()
  @Matches(YEAR_PATTERN, { message: 'targetYear must be in format YYYY-YYYY' })
  targetYear!: string
}
