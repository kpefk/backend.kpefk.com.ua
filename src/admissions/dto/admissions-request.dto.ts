import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'

const MIN_YEAR = 2000
const MAX_YEAR = 2100

const CLAIM_VALUES = ['all', 'budget', 'contract', 'both'] as const
const TRISTATE_VALUES = ['all', 'yes', 'no'] as const
export type ClaimFilterValue = (typeof CLAIM_VALUES)[number]
export type TriStateValue = (typeof TRISTATE_VALUES)[number]

export class SyncAdmissionsDto {
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  year!: number
}

export class AdmissionYearQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  year!: number
}

/** Рік + активні фільтри списку заяв (для експорту у .xlsx). */
export class ExportApplicationsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  year!: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  status?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  speciality?: string

  @IsOptional()
  @IsIn(CLAIM_VALUES)
  claim?: ClaimFilterValue

  @IsOptional()
  @IsIn(TRISTATE_VALUES)
  enrolled?: TriStateValue

  @IsOptional()
  @IsIn(TRISTATE_VALUES)
  requirements?: TriStateValue
}

export class KonkursDistributionQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  year!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  bucketSize?: number
}

/** Оновлення налаштувань кампанії (авто-реєстрація + частий ресинк). Усі поля опційні. */
export class UpdateCampaignSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoRegisterEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  autoCaseNumberEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  pollEnabled?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  pollWindowStartHour?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  pollWindowEndHour?: number

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(86_400)
  pollIntervalActiveSec?: number

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(86_400)
  pollIntervalOffHoursSec?: number

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  registrationDescryptionDefault?: string
}

/** Оновлення налаштувань КП (суфікс справи + текст реєстрації). */
export class UpdateOfferSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  caseSuffix?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  registrationDescryption?: string
}
