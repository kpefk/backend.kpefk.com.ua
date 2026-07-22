import type { AdmissionCampaignStatus } from '@prisma/client'

import type { AdmissionFunnel, BudgetContractSplit, KonkursBucket } from '../admission-report'

export class AdmissionYearDto {
  admissionYear!: number
  status!: AdmissionCampaignStatus
  lastSyncedAt!: string | null
  offersCount!: number
  applicationsCount!: number
}

export class AdmissionOverviewDto {
  admissionYear!: number
  status!: AdmissionCampaignStatus
  lastSyncedAt!: string | null
  offersCount!: number
  applicationsCount!: number
  enrolledCount!: number
  averageKonkurs!: number | null
  funnel!: AdmissionFunnel
  budgetContract!: BudgetContractSplit
}

export class AdmissionOfferRowDto {
  universitySpecialitiesId!: number
  name!: string | null
  specialityCode!: string | null
  specialityName!: string | null
  educationFormName!: string | null
  educationBaseName!: string | null
  offerTypeName!: string | null
  budgetOrder!: number | null
  maxOrder!: number | null
  educationPrice!: number | null
  applicationsCount!: number
  enrolledCount!: number
}

export class AdmissionSpecialityRowDto {
  specialityCode!: string | null
  specialityName!: string
  /** ОПП (освітня програма) — розбиття, коли одна спеціальність має кілька програм. */
  programName!: string | null
  applicationsCount!: number
  enrolledCount!: number
  /** Скасовані заяви (статуси «Скасовано…»). Входять до applicationsCount. */
  cancelledCount!: number
  budgetClaims!: number
  contractClaims!: number
  averageKonkurs!: number | null
}

export class KonkursDistributionDto {
  admissionYear!: number
  buckets!: KonkursBucket[]
}

export class AdmissionTrendPointDto {
  admissionYear!: number
  applicationsCount!: number
  enrolledCount!: number
}

/** Кількість поданих заяв за день у розрізі ОПП. */
export class AdmissionDailyPointDto {
  /** Дата подання (YYYY-MM-DD). */
  date!: string
  /** Усього подано цього дня. */
  total!: number
  /** Мапа «ОПП → кількість поданих цього дня». */
  counts!: Record<string, number>
}

/** Динаміка подання заяв по днях у розрізі ОПП. */
export class AdmissionByDayDto {
  admissionYear!: number
  /** Перелік ОПП (серій графіка), відсортований за спаданням загальної кількості. */
  programs!: string[]
  points!: AdmissionDailyPointDto[]
}

/** Операційний рядок заяви (з ПД — лише активна кампанія). */
export class AdmissionApplicationRowDto {
  personRequestId!: string
  personalCode!: string | null
  fio!: string | null
  statusTypeName!: string | null
  konkursValue!: number | null
  requestPriority!: number | null
  isClaimForBudget!: boolean | null
  isClaimForContract!: boolean | null
  isOriginalDocumentsAdded!: boolean | null
  enrolled!: boolean
  phone!: string | null
  email!: string | null
  specialityName!: string | null
  educationFormName!: string | null
  /** Документ про освіту (свідоцтво/атестат) — заповнено для заочних КП. */
  entryEduDocTypeName!: string | null
  entryEduDocSeries!: string | null
  entryEduDocNumber!: string | null
  entryEduDocYearEnd!: number | null
}

/** Налаштування КП для авто-реєстрації (рядок таблиці на сторінці налаштувань). */
export class AdmissionOfferSettingRowDto {
  universitySpecialitiesId!: number
  name!: string | null
  specialityCode!: string | null
  caseSuffix!: string | null
  registrationDescryption!: string | null
  /** К-сть заяв у статусі «Заява надійшла з сайту» (кандидати на авто-реєстрацію). */
  siteCount!: number
}

/** Налаштування кампанії + перелік КП. */
export class AdmissionSettingsDto {
  admissionYear!: number
  status!: AdmissionCampaignStatus
  autoRegisterEnabled!: boolean
  autoCaseNumberEnabled!: boolean
  pollEnabled!: boolean
  pollWindowStartHour!: number
  pollWindowEndHour!: number
  pollIntervalActiveSec!: number
  pollIntervalOffHoursSec!: number
  registrationDescryptionDefault!: string | null
  lastAutoPollAt!: string | null
  offers!: AdmissionOfferSettingRowDto[]
}
