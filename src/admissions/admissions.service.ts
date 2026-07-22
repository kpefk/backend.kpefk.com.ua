import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AdmissionCampaignStatus } from '@prisma/client'
import * as XLSX from 'xlsx'

import { PrismaService } from '@/prisma/prisma.service'

import {
  type AdmissionAppLike,
  bucketKonkurs,
  funnelCounts,
  splitBudgetContract,
} from './admission-report'
import type {
  ClaimFilterValue,
  TriStateValue,
  UpdateCampaignSettingsDto,
  UpdateOfferSettingsDto,
} from './dto/admissions-request.dto'

/** Активні фільтри списку заяв (для експорту). Дзеркалить клієнтський `filterApplications`. */
export interface ApplicationExportFilters {
  search?: string
  status?: string
  speciality?: string
  claim?: ClaimFilterValue
  enrolled?: TriStateValue
  requirements?: TriStateValue
}
import type {
  AdmissionApplicationRowDto,
  AdmissionByDayDto,
  AdmissionOfferRowDto,
  AdmissionOfferSettingRowDto,
  AdmissionOverviewDto,
  AdmissionSettingsDto,
  AdmissionSpecialityRowDto,
  AdmissionTrendPointDto,
  AdmissionYearDto,
  KonkursDistributionDto,
} from './dto/admissions-response.dto'
import { SITE_STATUS_ID } from './admissions.constants'

/** Чи є статус заяви «скасованим» (напр. «Скасовано вступником», «Скасовано (втрата пріор.)»). */
function isCancelledStatus(statusTypeName: string | null): boolean {
  return statusTypeName !== null && /^Скасов/i.test(statusTypeName.trim())
}

/** Легка проекція заяви для агрегатів. */
const APP_AGG_SELECT = {
  offerId: true,
  konkursValue: true,
  isClaimForBudget: true,
  isClaimForContract: true,
  budgetRecommendationTypeId: true,
  isOriginalDocumentsAdded: true,
  orderOfEnrollmentId: true,
} as const

@Injectable()
export class AdmissionsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async listYears(): Promise<AdmissionYearDto[]> {
    const campaigns = await this.prisma.admissionCampaign.findMany({
      orderBy: { admissionYear: 'desc' },
    })
    const rows: AdmissionYearDto[] = []
    for (const c of campaigns) {
      const [offersCount, applicationsCount] = await Promise.all([
        this.prisma.admissionOffer.count({ where: { admissionYear: c.admissionYear } }),
        this.prisma.admissionApplication.count({ where: { admissionYear: c.admissionYear } }),
      ])
      rows.push({
        admissionYear: c.admissionYear,
        status: c.status,
        lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
        offersCount,
        applicationsCount,
      })
    }
    return rows
  }

  public async getOverview(year: number): Promise<AdmissionOverviewDto> {
    const campaign = await this.requireCampaign(year)
    const [offersCount, apps] = await Promise.all([
      this.prisma.admissionOffer.count({ where: { admissionYear: year } }),
      this.prisma.admissionApplication.findMany({
        where: { admissionYear: year },
        select: APP_AGG_SELECT,
      }),
    ])
    const likes = apps.map(this.toAppLike)
    const funnel = funnelCounts(likes)
    const budgetContract = splitBudgetContract(likes)
    const konkurs = likes
      .map((a) => a.konkursValue)
      .filter((v): v is number => v !== null)
    const averageKonkurs =
      konkurs.length > 0
        ? Math.round((konkurs.reduce((s, v) => s + v, 0) / konkurs.length) * 100) / 100
        : null

    return {
      admissionYear: year,
      status: campaign.status,
      lastSyncedAt: campaign.lastSyncedAt?.toISOString() ?? null,
      offersCount,
      applicationsCount: likes.length,
      enrolledCount: funnel.enrolled,
      averageKonkurs,
      funnel,
      budgetContract,
    }
  }

  public async listOffers(year: number): Promise<AdmissionOfferRowDto[]> {
    await this.requireCampaign(year)
    const offers = await this.prisma.admissionOffer.findMany({
      where: { admissionYear: year },
      orderBy: [{ specialityCode: 'asc' }, { universitySpecialitiesName: 'asc' }],
      include: {
        _count: { select: { applications: true } },
        applications: {
          where: { orderOfEnrollmentId: { not: null } },
          select: { id: true },
        },
      },
    })
    return offers.map((o) => ({
      universitySpecialitiesId: o.universitySpecialitiesId,
      name: o.universitySpecialitiesName,
      specialityCode: o.specialityCode,
      specialityName: o.specialityName,
      educationFormName: o.educationFormName,
      educationBaseName: o.educationBaseName,
      offerTypeName: o.offerTypeName,
      budgetOrder: o.budgetOrder,
      maxOrder: o.maxOrder,
      educationPrice: o.educationPrice,
      applicationsCount: o._count.applications,
      enrolledCount: o.applications.length,
    }))
  }

  public async bySpeciality(year: number): Promise<AdmissionSpecialityRowDto[]> {
    await this.requireCampaign(year)
    const offers = await this.prisma.admissionOffer.findMany({
      where: { admissionYear: year },
      select: { id: true, specialityCode: true, specialityName: true, programNames: true },
    })
    const offerMeta = new Map(offers.map((o) => [o.id, o]))
    const apps = await this.prisma.admissionApplication.findMany({
      where: { admissionYear: year },
      select: { ...APP_AGG_SELECT, statusTypeName: true },
    })

    interface Acc {
      code: string | null
      name: string
      program: string | null
      apps: AdmissionAppLike[]
      enrolled: number
      cancelled: number
      budget: number
      contract: number
    }
    const byKey = new Map<string, Acc>()
    for (const a of apps) {
      const meta = offerMeta.get(a.offerId)
      const name = meta?.specialityName ?? '—'
      const code = meta?.specialityCode ?? null
      // Розбиття по ОПП (програмі), якщо вона є; інакше — по спеціальності.
      const program = meta?.programNames ?? null
      const key = `${code ?? ''}|${program ?? name}`
      let acc = byKey.get(key)
      if (!acc) {
        acc = { code, name, program, apps: [], enrolled: 0, cancelled: 0, budget: 0, contract: 0 }
        byKey.set(key, acc)
      }
      acc.apps.push(this.toAppLike(a))
      if (a.orderOfEnrollmentId !== null) acc.enrolled++
      if (isCancelledStatus(a.statusTypeName)) acc.cancelled++
      if (a.isClaimForBudget === true) acc.budget++
      if (a.isClaimForContract === true) acc.contract++
    }

    return [...byKey.values()]
      .map((acc) => {
        const konkurs = acc.apps
          .map((x) => x.konkursValue)
          .filter((v): v is number => v !== null)
        const averageKonkurs =
          konkurs.length > 0
            ? Math.round((konkurs.reduce((s, v) => s + v, 0) / konkurs.length) * 100) / 100
            : null
        return {
          specialityCode: acc.code,
          specialityName: acc.name,
          programName: acc.program,
          applicationsCount: acc.apps.length,
          enrolledCount: acc.enrolled,
          cancelledCount: acc.cancelled,
          budgetClaims: acc.budget,
          contractClaims: acc.contract,
          averageKonkurs,
        }
      })
      .sort((a, b) => b.applicationsCount - a.applicationsCount)
  }

  /** Динаміка подання заяв по днях (за `dateCreate`) у розрізі ОПП. */
  public async byDay(year: number): Promise<AdmissionByDayDto> {
    await this.requireCampaign(year)
    const offers = await this.prisma.admissionOffer.findMany({
      where: { admissionYear: year },
      select: { id: true, specialityName: true, programNames: true },
    })
    const programByOffer = new Map(
      offers.map((o) => [o.id, o.programNames ?? o.specialityName ?? '—']),
    )
    const apps = await this.prisma.admissionApplication.findMany({
      where: { admissionYear: year, dateCreate: { not: null } },
      select: { offerId: true, dateCreate: true },
    })

    // day -> (program -> count) та загальні лічильники по ОПП для сортування серій.
    const byDay = new Map<string, Map<string, number>>()
    const programTotals = new Map<string, number>()
    for (const a of apps) {
      if (!a.dateCreate) continue
      const day = a.dateCreate.toISOString().slice(0, 10)
      const program = programByOffer.get(a.offerId) ?? '—'
      let dayMap = byDay.get(day)
      if (!dayMap) {
        dayMap = new Map()
        byDay.set(day, dayMap)
      }
      dayMap.set(program, (dayMap.get(program) ?? 0) + 1)
      programTotals.set(program, (programTotals.get(program) ?? 0) + 1)
    }

    const programs = [...programTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p)

    const points = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, dayMap]) => {
        const counts: Record<string, number> = {}
        let total = 0
        for (const [program, n] of dayMap) {
          counts[program] = n
          total += n
        }
        return { date, total, counts }
      })

    return { admissionYear: year, programs, points }
  }

  public async konkursDistribution(
    year: number,
    bucketSize = 20,
  ): Promise<KonkursDistributionDto> {
    await this.requireCampaign(year)
    const apps = await this.prisma.admissionApplication.findMany({
      where: { admissionYear: year, konkursValue: { not: null } },
      select: { konkursValue: true },
    })
    const values = apps
      .map((a) => (a.konkursValue !== null ? Number(a.konkursValue) : null))
      .filter((v): v is number => v !== null)
    return { admissionYear: year, buckets: bucketKonkurs(values, bucketSize) }
  }

  public async yearTrends(): Promise<AdmissionTrendPointDto[]> {
    const campaigns = await this.prisma.admissionCampaign.findMany({
      orderBy: { admissionYear: 'asc' },
    })
    const rows: AdmissionTrendPointDto[] = []
    for (const c of campaigns) {
      const [applicationsCount, enrolledCount] = await Promise.all([
        this.prisma.admissionApplication.count({ where: { admissionYear: c.admissionYear } }),
        this.prisma.admissionApplication.count({
          where: { admissionYear: c.admissionYear, orderOfEnrollmentId: { not: null } },
        }),
      ])
      rows.push({ admissionYear: c.admissionYear, applicationsCount, enrolledCount })
    }
    return rows
  }

  /**
   * Операційний список заяв із ПД. Дозволений лише для активної кампанії
   * (в архіві ПД вичищено). Факт доступу до ПД фіксується в AuditLog
   * (Закон №2297-VI ст. 24 — аудит доступу до чутливих даних).
   */
  public async listApplications(
    year: number,
    userId: string,
    ip: string | null,
  ): Promise<AdmissionApplicationRowDto[]> {
    const rows = await this.fetchApplicationRows(year)
    await this.logPiiAccess(userId, year, ip, 'VIEW_ADMISSION_PII')
    return rows
  }

  /**
   * Експорт заяв вступників у .xlsx (лише активна кампанія). Доступ до ПД фіксується в AuditLog.
   */
  public async exportApplicationsXlsx(
    year: number,
    filters: ApplicationExportFilters,
    userId: string,
    ip: string | null,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const rows = await this.fetchApplicationRows(year)
    const filtered = this.applyApplicationFilters(rows, filters)
    await this.logPiiAccess(userId, year, ip, 'EXPORT_ADMISSION_PII')
    return this.buildApplicationsXlsx(year, filtered)
  }

  /** Застосовує ті самі фільтри, що й у списку на клієнті (`filterApplications`). */
  private applyApplicationFilters(
    rows: AdmissionApplicationRowDto[],
    f: ApplicationExportFilters,
  ): AdmissionApplicationRowDto[] {
    const q = (f.search ?? '').trim().toLowerCase()
    return rows.filter((a) => {
      if (
        q !== '' &&
        !(a.fio ?? '').toLowerCase().includes(q) &&
        !(a.personalCode ?? '').toLowerCase().includes(q) &&
        !(a.specialityName ?? '').toLowerCase().includes(q) &&
        !(a.statusTypeName ?? '').toLowerCase().includes(q)
      ) {
        return false
      }
      if (f.status && a.statusTypeName !== f.status) return false
      if (f.speciality && a.specialityName !== f.speciality) return false
      if (f.claim === 'budget' && !(a.isClaimForBudget && !a.isClaimForContract)) return false
      if (f.claim === 'contract' && !(a.isClaimForContract && !a.isClaimForBudget)) return false
      if (f.claim === 'both' && !(a.isClaimForBudget && a.isClaimForContract)) return false
      if (f.enrolled === 'yes' && !a.enrolled) return false
      if (f.enrolled === 'no' && a.enrolled) return false
      if (f.requirements === 'yes' && !a.isOriginalDocumentsAdded) return false
      if (f.requirements === 'no' && a.isOriginalDocumentsAdded) return false
      return true
    })
  }

  /** Спільна вибірка рядків заяв (без аудиту) для перегляду та експорту. */
  private async fetchApplicationRows(year: number): Promise<AdmissionApplicationRowDto[]> {
    const campaign = await this.requireCampaign(year)
    if (campaign.status === AdmissionCampaignStatus.ARCHIVED) {
      throw new BadRequestException(
        'Рік архівовано — персональні дані заяв вичищено. Доступні лише агреговані звіти.',
      )
    }

    const apps = await this.prisma.admissionApplication.findMany({
      where: { admissionYear: year },
      orderBy: [{ konkursValue: 'desc' }],
      include: { offer: { select: { specialityName: true, educationFormName: true } } },
    })
    return apps.map((a) => ({
      personRequestId: a.personRequestId,
      personalCode: a.personalCode,
      fio: a.fio,
      statusTypeName: a.statusTypeName,
      konkursValue: a.konkursValue !== null ? Number(a.konkursValue) : null,
      requestPriority: a.requestPriority,
      isClaimForBudget: a.isClaimForBudget,
      isClaimForContract: a.isClaimForContract,
      isOriginalDocumentsAdded: a.isOriginalDocumentsAdded,
      enrolled: a.orderOfEnrollmentId !== null,
      phone: a.phone,
      email: a.email,
      specialityName: a.offer.specialityName,
      educationFormName: a.offer.educationFormName,
      entryEduDocTypeName: a.entryEduDocTypeName,
      entryEduDocSeries: a.entryEduDocSeries,
      entryEduDocNumber: a.entryEduDocNumber,
      entryEduDocYearEnd: a.entryEduDocYearEnd,
    }))
  }

  private async logPiiAccess(
    userId: string,
    year: number,
    ip: string | null,
    action: 'VIEW_ADMISSION_PII' | 'EXPORT_ADMISSION_PII',
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        targetId: String(year),
        targetType: 'AdmissionCampaign',
        ipAddress: ip,
        metadata: {},
      },
    })
  }

  /** Формує .xlsx із рядків заяв вступників. */
  private buildApplicationsXlsx(
    year: number,
    rows: AdmissionApplicationRowDto[],
  ): { buffer: Buffer; filename: string } {
    const claimLabel = (a: AdmissionApplicationRowDto): string => {
      if (a.isClaimForBudget && a.isClaimForContract) return 'Бюджет + Контракт'
      if (a.isClaimForBudget) return 'Бюджет'
      if (a.isClaimForContract) return 'Контракт'
      return ''
    }
    const eduDoc = (a: AdmissionApplicationRowDto): string => {
      if (!a.entryEduDocNumber) return ''
      const parts = [
        a.entryEduDocTypeName,
        `${a.entryEduDocSeries ? `${a.entryEduDocSeries} ` : ''}№${a.entryEduDocNumber}`,
        a.entryEduDocYearEnd ? `(${a.entryEduDocYearEnd})` : null,
      ].filter((p): p is string => !!p)
      return parts.join(' ')
    }

    const sheetRows = rows.map((a, i) => ({
      '№': i + 1,
      '№ справи': a.personalCode ?? '',
      ПІБ: a.fio ?? '',
      Спеціальність: a.specialityName ?? '',
      Форма: a.educationFormName ?? '',
      Статус: a.statusTypeName ?? '',
      'Конкурсний бал': a.konkursValue ?? '',
      Пріоритет: a.requestPriority ?? '',
      'Претендує на': claimLabel(a),
      Зараховано: a.enrolled ? 'Так' : '',
      'Виконано вимоги': a.isOriginalDocumentsAdded ? 'Так' : '',
      'Документ про освіту': eduDoc(a),
      Телефон: a.phone ?? '',
      Email: a.email ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(sheetRows)
    ws['!cols'] = [
      { wch: 5 }, // №
      { wch: 10 }, // № справи
      { wch: 34 }, // ПІБ
      { wch: 24 }, // Спеціальність
      { wch: 10 }, // Форма
      { wch: 22 }, // Статус
      { wch: 8 }, // Бал
      { wch: 8 }, // Пріоритет
      { wch: 18 }, // Претендує
      { wch: 10 }, // Зараховано
      { wch: 14 }, // Виконано вимоги
      { wch: 40 }, // Документ про освіту
      { wch: 16 }, // Телефон
      { wch: 24 }, // Email
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Вступники')

    const buffer = Buffer.from(
      XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer,
    )
    return { buffer, filename: `Вступники_${year}.xlsx` }
  }

  // ── Налаштування (авто-реєстрація + частий ресинк) ──────────────────────

  /**
   * Налаштування кампанії + перелік КП із суфіксами справ і лічильником заяв статусу «з сайту».
   * Якщо `caseSuffix` порожній — авто-сідується з наявних personalCode КП і зберігається.
   */
  public async getSettings(year: number): Promise<AdmissionSettingsDto> {
    const campaign = await this.requireCampaign(year)
    const offers = await this.prisma.admissionOffer.findMany({
      where: { admissionYear: year },
      orderBy: { specialityName: 'asc' },
      select: {
        id: true,
        universitySpecialitiesId: true,
        universitySpecialitiesName: true,
        specialityName: true,
        specialityCode: true,
        caseSuffix: true,
        registrationDescryption: true,
      },
    })

    const siteCounts = await this.prisma.admissionApplication.groupBy({
      by: ['offerId'],
      where: { admissionYear: year, statusTypeId: SITE_STATUS_ID },
      _count: { _all: true },
    })
    const siteByOffer = new Map(siteCounts.map((r) => [r.offerId, r._count._all]))

    const rows: AdmissionOfferSettingRowDto[] = []
    for (const o of offers) {
      let caseSuffix = o.caseSuffix
      if (!caseSuffix) {
        const seeded = await this.seedCaseSuffix(o.id)
        if (seeded) caseSuffix = seeded
      }
      rows.push({
        universitySpecialitiesId: o.universitySpecialitiesId,
        name: o.universitySpecialitiesName ?? o.specialityName,
        specialityCode: o.specialityCode,
        caseSuffix,
        registrationDescryption: o.registrationDescryption,
        siteCount: siteByOffer.get(o.id) ?? 0,
      })
    }

    return {
      admissionYear: campaign.admissionYear,
      status: campaign.status,
      autoRegisterEnabled: campaign.autoRegisterEnabled,
      autoCaseNumberEnabled: campaign.autoCaseNumberEnabled,
      pollEnabled: campaign.pollEnabled,
      pollWindowStartHour: campaign.pollWindowStartHour,
      pollWindowEndHour: campaign.pollWindowEndHour,
      pollIntervalActiveSec: campaign.pollIntervalActiveSec,
      pollIntervalOffHoursSec: campaign.pollIntervalOffHoursSec,
      registrationDescryptionDefault: campaign.registrationDescryptionDefault,
      lastAutoPollAt: campaign.lastAutoPollAt?.toISOString() ?? null,
      offers: rows,
    }
  }

  public async updateCampaignSettings(
    year: number,
    dto: UpdateCampaignSettingsDto,
  ): Promise<AdmissionSettingsDto> {
    await this.requireCampaign(year)
    await this.prisma.admissionCampaign.update({ where: { admissionYear: year }, data: dto })
    return this.getSettings(year)
  }

  public async updateOfferSettings(
    year: number,
    universitySpecialitiesId: number,
    dto: UpdateOfferSettingsDto,
  ): Promise<AdmissionOfferSettingRowDto> {
    const offer = await this.prisma.admissionOffer.findUnique({
      where: {
        admissionYear_universitySpecialitiesId: { admissionYear: year, universitySpecialitiesId },
      },
      select: { id: true },
    })
    if (!offer) throw new NotFoundException('Конкурсну пропозицію не знайдено.')

    const updated = await this.prisma.admissionOffer.update({
      where: { id: offer.id },
      data: {
        ...(dto.caseSuffix !== undefined ? { caseSuffix: dto.caseSuffix.trim() || null } : {}),
        ...(dto.registrationDescryption !== undefined
          ? { registrationDescryption: dto.registrationDescryption.trim() || null }
          : {}),
      },
      select: {
        id: true,
        universitySpecialitiesId: true,
        universitySpecialitiesName: true,
        specialityName: true,
        specialityCode: true,
        caseSuffix: true,
        registrationDescryption: true,
      },
    })
    const siteCount = await this.prisma.admissionApplication.count({
      where: { admissionYear: year, offerId: updated.id, statusTypeId: SITE_STATUS_ID },
    })
    return {
      universitySpecialitiesId: updated.universitySpecialitiesId,
      name: updated.universitySpecialitiesName ?? updated.specialityName,
      specialityCode: updated.specialityCode,
      caseSuffix: updated.caseSuffix,
      registrationDescryption: updated.registrationDescryption,
      siteCount,
    }
  }

  /** Виводить суфікс справи з наявних personalCode КП (напр. «07-Т» → «Т») і зберігає його. */
  private async seedCaseSuffix(offerId: string): Promise<string | null> {
    const rows = await this.prisma.admissionApplication.findMany({
      where: { offerId, personalCode: { not: null } },
      select: { personalCode: true },
    })
    const counts = new Map<string, number>()
    for (const { personalCode } of rows) {
      const m = /^\d+-(.+)$/.exec(personalCode ?? '')
      if (m) {
        const s = m[1]!.trim()
        counts.set(s, (counts.get(s) ?? 0) + 1)
      }
    }
    if (counts.size === 0) return null
    // Найчастіший суфікс серед наявних номерів КП.
    const suffix = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0]
    await this.prisma.admissionOffer.update({ where: { id: offerId }, data: { caseSuffix: suffix } })
    return suffix
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async requireCampaign(year: number) {
    const campaign = await this.prisma.admissionCampaign.findUnique({
      where: { admissionYear: year },
    })
    if (!campaign) throw new NotFoundException('Кампанію за цей рік не знайдено.')
    return campaign
  }

  private toAppLike(a: {
    konkursValue: unknown
    isClaimForBudget: boolean | null
    isClaimForContract: boolean | null
    budgetRecommendationTypeId: number | null
    isOriginalDocumentsAdded: boolean | null
    orderOfEnrollmentId: number | null
  }): AdmissionAppLike {
    return {
      konkursValue: a.konkursValue !== null && a.konkursValue !== undefined ? Number(a.konkursValue) : null,
      isClaimForBudget: a.isClaimForBudget,
      isClaimForContract: a.isClaimForContract,
      budgetRecommendationTypeId: a.budgetRecommendationTypeId,
      isOriginalDocumentsAdded: a.isOriginalDocumentsAdded,
      orderOfEnrollmentId: a.orderOfEnrollmentId,
    }
  }
}
