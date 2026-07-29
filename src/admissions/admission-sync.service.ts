import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression, Interval } from '@nestjs/schedule'
import { AdmissionCampaignStatus, type Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { EntranceService } from '@/edbo/entrance/entrance.service'
import { EdboService } from '@/edbo/core/edbo.service'
import { isDev } from '@/libs/common/utils/is-dev.util'
import type { SpecialitiesListResponseDto } from '@/edbo/entrance/dto/specialities-list-response.dto'
import type { PersonRequestList2ResponseDto } from '@/edbo/entrance/dto/person-request-list2-response.dto'

import {
  APPLICATION_PII_FIELDS,
  AUTO_POLL_TICK_MS,
  CAMPAIGN_MONTHS,
  EDBO_PAGE_SIZE,
  REGISTERED_STATUS_TYPE_ID,
  SITE_STATUS_ID,
} from './admissions.constants'

const PERSON_REQUEST_LIST2_PATH = '/api/entrance/personRequest/list2'

/**
 * ЄДЕБО непослідовний у назвах JSON-ключів (offers беруть `universityID` з великим ID).
 * personRequest/list2 із `universitySpecialitiesId` віддає «Параметр UniversitySpecialitiesId
 * має бути заповненим». Пробуємо кандидатні форми ключів на першому виклику й кешуємо
 * робочу — щоб не гадати casing.
 */
type List2Body = Record<string, unknown>
const LIST2_BODY_VARIANTS: ReadonlyArray<{
  label: string
  build: (id: number, pageNo: number, pageSize: number) => List2Body
}> = [
  {
    label: 'universitySpecialitiesID',
    build: (id, p, s) => ({ universitySpecialitiesID: id, p_PageNo: p, p_PageSize: s, statusesList: [] }),
  },
  {
    label: 'universitySpecialitiesId',
    build: (id, p, s) => ({ universitySpecialitiesId: id, p_PageNo: p, p_PageSize: s, statusesList: [] }),
  },
  {
    label: 'UniversitySpecialitiesId+StatusesList',
    build: (id, p, s) => ({ UniversitySpecialitiesId: id, p_PageNo: p, p_PageSize: s, StatusesList: [] }),
  },
]

/** Результат синхронізації одного року. */
export interface AdmissionSyncResult {
  admissionYear: number
  offers: number
  applications: number
}

/** Результат проходу авто-реєстрації заяв (статус 1 → 5 + номер справи). */
export interface AutoRegisterResult {
  admissionYear: number
  registered: number
  skipped: number
  failed: number
  /** У dev — реальних ЄДЕБО-запитів немає, лише розрахунок і лог. */
  dryRun: boolean
}

/** Результат вибірки документів про освіту заочних вступників. */
export interface EntryEducationDocResult {
  admissionYear: number
  /** Осіб, для яких знайдено й збережено документ про освіту. */
  fetched: number
  /** Осіб, у яких не знайдено відповідного документа. */
  notFound: number
  /** Заяв без коду особи (personCodeU) — пропущено. */
  skipped: number
}

/** Мінімальна проекція документа особи з `physPersons/documents` (потрібні поля). */
interface EdboEntrantDoc {
  personDocumentTypeName: string | null
  documentSeries: string | null
  documentNumbers: string | null
  documentDateGet: string | null
  documentIssued: string | null
  isCancelled: boolean | null
  isDeleted: boolean | null
  isEntrantDocument: number | boolean | null
  yearEnd: number | null
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

@Injectable()
export class AdmissionSyncService {
  private readonly logger = new Logger(AdmissionSyncService.name)
  private readonly universityId: number
  /** Захист від паралельного запуску (важкий багатосторінковий обхід ЄДЕБО). */
  private isSyncing = false
  /** Кешований індекс робочої форми ключів для personRequest/list2 (див. LIST2_BODY_VARIANTS). */
  private list2VariantIndex: number | null = null

  public constructor(
    private readonly prisma: PrismaService,
    private readonly entrance: EntranceService,
    private readonly edbo: EdboService,
    private readonly configService: ConfigService,
  ) {
    this.universityId = Number(this.configService.getOrThrow<string>('EDEBO_CODE'))
  }

  /**
   * Cron: у пік вступної кампанії (черв–вер) щодня о 03:00 оновлює знімок поточного року.
   * Поза вікном — no-op. Один щоденний прохід — прийнятне навантаження на ЄДЕБО.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  public async syncCampaignDaily(): Promise<void> {
    const now = new Date()
    if (!CAMPAIGN_MONTHS.includes(now.getMonth() + 1)) return
    try {
      await this.syncYear(now.getFullYear())
    } catch (err) {
      this.logger.error('Admission cron sync failed', err)
    }
  }

  /**
   * Частий ресинк для коректної нумерації справ. Тікає кожні {@link AUTO_POLL_TICK_MS},
   * але реальний інтервал бере з налаштувань активної кампанії (робочі години vs поза вікном).
   * Якщо `pollEnabled` і минув інтервал → повна ресинхронізація; якщо `autoRegisterEnabled` →
   * прохід авто-реєстрації. `isSyncing`-guard у `syncYear` захищає від перекриття тіків.
   */
  @Interval(AUTO_POLL_TICK_MS)
  public async autoPollTick(): Promise<void> {
    const year = new Date().getFullYear()
    const campaign = await this.prisma.admissionCampaign.findUnique({ where: { admissionYear: year } })
    if (!campaign || campaign.status !== AdmissionCampaignStatus.ACTIVE || !campaign.pollEnabled) {
      return
    }

    const now = new Date()
    const hour = now.getHours()
    const inWindow = hour >= campaign.pollWindowStartHour && hour < campaign.pollWindowEndHour
    const intervalMs =
      (inWindow ? campaign.pollIntervalActiveSec : campaign.pollIntervalOffHoursSec) * 1000
    const elapsed = campaign.lastAutoPollAt ? now.getTime() - campaign.lastAutoPollAt.getTime() : Infinity
    if (elapsed < intervalMs) return

    // Оптимістично фіксуємо мітку до роботи, щоб паралельні тіки не дублювали прохід.
    await this.prisma.admissionCampaign.update({
      where: { admissionYear: year },
      data: { lastAutoPollAt: now },
    })

    try {
      await this.syncYear(year)
      if (campaign.autoRegisterEnabled) {
        await this.autoRegisterPending(year)
      }
    } catch (err) {
      this.logger.error('Admission auto-poll tick failed', err)
    }
  }

  /**
   * Авто-реєстрація заяв статусу «Заява надійшла з сайту» (1) → «Зареєстровано» (5):
   * змінює статус у ЄДЕБО та присвоює номер справи «NN-суфікс» (суфікс — з налаштувань КП).
   * У dev — сухий прогон (лише лог розрахованого номера, без ЄДЕБО-запитів).
   * Помилка однієї заяви не валить решту. `userId` (за наявності) → запис у AuditLog.
   */
  public async autoRegisterPending(
    admissionYear: number,
    userId?: string,
  ): Promise<AutoRegisterResult> {
    const dryRun = !isDev(this.configService)
    const campaign = await this.prisma.admissionCampaign.findUnique({ where: { admissionYear } })
    if (!campaign) throw new BadRequestException('Кампанію за цей рік не знайдено.')
    if (campaign.status === AdmissionCampaignStatus.ARCHIVED) {
      throw new BadRequestException('Архівний рік заморожено — авто-реєстрація недоступна.')
    }

    // Автопроставляння номера справи (PersonalCode) — окремий перемикач.
    const assignCaseNumber = campaign.autoCaseNumberEnabled

    const pending = await this.prisma.admissionApplication.findMany({
      where: {
        admissionYear,
        // Нові заяви «з сайту» — змінити статус на «Зареєстровано». Уже зареєстровані без номера
        // (orphan після часткової невдачі) обробляємо лише коли автопроставляння номера ввімкнено.
        OR: assignCaseNumber
          ? [
              { statusTypeId: SITE_STATUS_ID },
              { statusTypeId: String(REGISTERED_STATUS_TYPE_ID), personalCode: null },
            ]
          : [{ statusTypeId: SITE_STATUS_ID }],
      },
      include: {
        offer: {
          select: {
            id: true,
            caseSuffix: true,
            registrationDescryption: true,
            universitySpecialitiesName: true,
          },
        },
      },
      // Номери справ присвоюються від старіших до новіших заяв (за часом подання в ЄДЕБО).
      // `personRequestId` — детермінований тайбрейкер при однаковому часі; NULLS LAST — заяви
      // без дати обробляються останніми.
      orderBy: [{ dateCreate: { sort: 'asc', nulls: 'last' } }, { personRequestId: 'asc' }],
    })

    let registered = 0
    let skipped = 0
    let failed = 0
    /** Наступний вільний номер на кожну КП (щоб не колізити в межах одного проходу). */
    const nextNumByOffer = new Map<string, number>()

    for (const app of pending) {
      const alreadyRegistered = app.statusTypeId === String(REGISTERED_STATUS_TYPE_ID)

      // Номер справи обчислюємо лише коли автопроставляння ввімкнено.
      let personalCode: string | null = null
      let nextNum = 0
      if (assignCaseNumber) {
        const suffix = app.offer.caseSuffix?.trim()
        if (!suffix) {
          skipped++
          this.logger.warn(
            `Авто-реєстрація: пропуск номера для заяви ${app.personRequestId} — КП «${app.offer.universitySpecialitiesName ?? app.offerId}» без суфікса справи`,
          )
          continue
        }
        nextNum = nextNumByOffer.get(app.offerId) ?? (await this.computeNextCaseNumber(app.offerId))
        personalCode = `${String(nextNum).padStart(2, '0')}-${suffix}`
      }

      const registrationDescryption =
        app.offer.registrationDescryption ?? campaign.registrationDescryptionDefault ?? ''

      try {
        if (dryRun) {
          const numPart = personalCode ? `, № справи=${personalCode}` : ' (без номера)'
          this.logger.log(
            `[DRY-RUN] заява ${app.personRequestId} (${app.fio ?? '—'})${alreadyRegistered ? ' (вже зареєстрована)' : ' → статус 5 «Зареєстровано»'}${numPart}`,
          )
        } else {
          // Зміну статусу робимо лише для заяв «з сайту»; для вже зареєстрованих — лише номер.
          if (!alreadyRegistered) {
            await this.entrance.personRequestChangeStatus({
              personRequestList: [{ id: Number(app.personRequestId) }],
              personRequestStatusTypeId: REGISTERED_STATUS_TYPE_ID,
              registrationDescryption,
            })
          }
          // Редагуємо саму заяву й присвоюємо номер справи (PersonalCode). Обов'язкові поля
          // передаємо з поточного стану заяви, щоб не затерти їх дефолтами.
          if (personalCode) {
            await this.entrance.personRequestUpdate({
              personRequestId: Number(app.personRequestId),
              personalCode,
              isGraduateOneYear: app.isGraduateOneYear ?? false,
              isAdditionalExam: app.isAdditionalExam ?? false,
              isClaimForBudget: app.isClaimForBudget ?? false,
              isClaimForContract: app.isClaimForContract ?? false,
              isBudgetEducation: app.isBudgetEducation ?? 1,
              isAnotherBudgetAllowed: app.isAnotherBudgetAllowed ?? false,
              isSimiliarSpeciality: app.isSimiliarSpeciality ?? false,
              isOriginalDocumentsAdded: app.isOriginalDocumentsAdded ?? false,
              informationOriginalDocumentLocation: app.informationOriginalDocumentLocation ?? false,
              isConfirmedContract: app.isConfirmedContract ?? false,
              ...(app.enrollPriority !== null ? { enrollPriority: app.enrollPriority } : {}),
              ...(app.foreignTypeId !== null ? { foreignTypeId: app.foreignTypeId } : {}),
              ...(app.isInterviewSuccess !== null
                ? { isInterviewSuccess: app.isInterviewSuccess }
                : {}),
            })
          }
        }

        if (userId) {
          await this.prisma.auditLog.create({
            data: {
              userId,
              action: 'AUTO_REGISTER_APPLICATION',
              targetType: 'AdmissionApplication',
              targetId: app.personRequestId,
              ipAddress: null,
              metadata: {
                personalCode,
                offer: app.offer.universitySpecialitiesName,
                statusFrom: alreadyRegistered ? REGISTERED_STATUS_TYPE_ID : Number(SITE_STATUS_ID),
                statusTo: REGISTERED_STATUS_TYPE_ID,
                caseNumberAssigned: personalCode !== null,
                dryRun,
              },
            },
          })
        }

        if (personalCode) nextNumByOffer.set(app.offerId, nextNum + 1)
        registered++
      } catch (err) {
        failed++
        this.logger.error(`Авто-реєстрація не вдалась для заяви ${app.personRequestId}`, err)
      }
    }

    this.logger.log(
      `Авто-реєстрація ${admissionYear}: зареєстровано=${registered} пропущено=${skipped} помилок=${failed} dryRun=${dryRun}`,
    )
    return { admissionYear, registered, skipped, failed, dryRun }
  }

  /** Наступний вільний номер справи для КП: max числового префікса наявних personalCode + 1. */
  private async computeNextCaseNumber(offerId: string): Promise<number> {
    const rows = await this.prisma.admissionApplication.findMany({
      where: { offerId, personalCode: { not: null } },
      select: { personalCode: true },
    })
    let max = 0
    for (const { personalCode } of rows) {
      const m = /^(\d+)/.exec(personalCode ?? '')
      if (m) max = Math.max(max, Number(m[1]))
    }
    return max + 1
  }


  /**
   * Для кожної нової особи із заявою тягне з ЄДЕБО документ про освіту
   * (свідоцтво про базову / атестат про повну загальну середню освіту) і зберігає його.
   * Групування — по парі (personCodeU, educationBaseName), бо одна особа може подати заяви
   * з різною основою вступу (базова vs повна середня) — раніше це змішувалось.
   * Один HTTP-виклик на унікального personCodeU (кешується), повторно не смикає
   * (мітка `entryEduDocFetchedAt`). Це ЄДЕБО-читання, тож виконується і в dev.
   */
  public async fetchEntryEducationDocs(admissionYear: number): Promise<EntryEducationDocResult> {
    const pending = await this.prisma.admissionApplication.findMany({
      where: {
        admissionYear,
        entryEduDocFetchedAt: null,
        // Якщо базова середня освіта трапляється і на денній формі — фільтр за формою
        // прибрано. За потреби поверніть:
        // offer: { educationFormName: { contains: 'Заочна', mode: 'insensitive' } },
      },
      select: {
        id: true,
        personCodeU: true,
        offer: { select: { educationBaseName: true } },
      },
    })

    // Групуємо по (personCodeU, educationBaseName) — щоб не змішувати різні основи вступу
    // однієї й тієї ж особи (напр. одночасно "Базова" і "Повна" загальна середня).
    const byGroup = new Map<string, { appIds: string[]; personCodeU: string; base: string | null }>()
    // Кешуємо сирі документи на особу, щоб не смикати ЄДЕБО повторно для тієї ж людини.
    const docsCacheByPerson = new Map<string, EdboEntrantDoc[] | null>()
    const noCodeIds: string[] = []

    for (const a of pending) {
      if (!a.personCodeU) {
        noCodeIds.push(a.id)
        continue
      }
      const base = a.offer.educationBaseName ?? null
      const key = `${a.personCodeU}::${base ?? ''}`
      let g = byGroup.get(key)
      if (!g) {
        g = { appIds: [], personCodeU: a.personCodeU, base }
        byGroup.set(key, g)
      }
      g.appIds.push(a.id)
    }

    let fetched = 0
    let notFound = 0
    const now = new Date()

    for (const [, g] of byGroup) {
      let docs: EdboEntrantDoc[] | null | undefined = docsCacheByPerson.get(g.personCodeU)

      if (docs === undefined) {
        try {
          docs = (await this.edbo.getPersonDocumentsSync(
            g.personCodeU,
          )) as unknown as EdboEntrantDoc[]
          docsCacheByPerson.set(g.personCodeU, docs)

          // Діагностика: лишаємо на рівні debug, щоб бачити реальну форму даних із ЄДЕБО
          // (типова причина "не підтягує диплом" — невідповідність назви типу документа).
          this.logger.debug(
            `Документи особи ${g.personCodeU} (сирі, ${docs.length} шт.): ${JSON.stringify(docs)}`,
          )
        } catch (err) {
          // Лишаємо fetchedAt null → повторимо наступного разу.
          this.logger.warn(`Документи особи ${g.personCodeU} недоступні: ${String(err)}`)
          docsCacheByPerson.set(g.personCodeU, null)
          continue
        }
      }

      if (docs === null) continue

      const doc = this.pickSecondaryEducationDoc(docs, g.base)

      if (!doc) {
        this.logger.warn(
          `Особа ${g.personCodeU}: документ про середню освіту (база="${g.base ?? '—'}") не знайдено серед ${docs.length} документів`,
        )
      }

      const data = doc
        ? {
            entryEduDocTypeName: doc.personDocumentTypeName ?? null,
            entryEduDocSeries: doc.documentSeries ?? null,
            entryEduDocNumber: doc.documentNumbers ?? null,
            entryEduDocDateGet: toDate(doc.documentDateGet),
            entryEduDocIssued: doc.documentIssued ?? null,
            entryEduDocYearEnd: doc.yearEnd ?? null,
            entryEduDocFetchedAt: now,
          }
        : { entryEduDocFetchedAt: now }

      await this.prisma.admissionApplication.updateMany({
        where: { id: { in: g.appIds } },
        data,
      })
      if (doc) fetched++
      else notFound++
    }

    // Заяви без personCodeU позначаємо обробленими, щоб не смикати їх щоразу.
    if (noCodeIds.length > 0) {
      await this.prisma.admissionApplication.updateMany({
        where: { id: { in: noCodeIds } },
        data: { entryEduDocFetchedAt: now },
      })
    }

    if (byGroup.size > 0 || noCodeIds.length > 0) {
      this.logger.log(
        `Документи про освіту ${admissionYear}: знайдено=${fetched} без документа=${notFound} без коду=${noCodeIds.length}`,
      )
    }
    return { admissionYear, fetched, notFound, skipped: noCodeIds.length }
  }

  /**
   * Обирає документ про освіту (свідоцтво/атестат про середню освіту), що відповідає основі
   * вступу КП: "Повна..." -> про повну загальну середню; "Базова..." -> про базову середню.
   * truthy() розширено підтримкою рядкового "1" — ЄДЕБО подекуди повертає булеві поля рядком.
   */
  private pickSecondaryEducationDoc(
    docs: EdboEntrantDoc[],
    educationBaseName: string | null,
  ): EdboEntrantDoc | null {
    const truthy = (v: unknown): boolean => v === true || v === 1 || v === '1'
    const falsy = (v: unknown): boolean => v === true || v === 1 || v === '1'

    const secondary = docs.filter(
      (x) =>
        truthy(x.isEntrantDocument) &&
        !falsy(x.isCancelled) &&
        !falsy(x.isDeleted) &&
        !!x.personDocumentTypeName &&
        /середн/i.test(x.personDocumentTypeName),
    )
    if (secondary.length === 0) return null

    const base = (educationBaseName ?? '').toLowerCase()
    const wantFull = base.includes('повн')
    const wantBasic = base.includes('базов')

    const preferred = secondary.find((x) => {
      const name = x.personDocumentTypeName!.toLowerCase()
      if (wantFull) return name.includes('повн')
      if (wantBasic) return name.includes('базов')
      return false
    })

    // Без явного збігу — найфундаментальніший (найменший рік закінчення).
    return (
      preferred ??
      secondary.reduce((best, cur) =>
        (cur.yearEnd ?? Number.MAX_SAFE_INTEGER) < (best.yearEnd ?? Number.MAX_SAFE_INTEGER)
          ? cur
          : best,
      )
    )
  }


  /**
   * Повний знімок року: КП + заяви по кожній КП (усі статуси). Зберігає ПД —
   * рік стає/лишається ACTIVE. Архівний рік синхронізувати не можна (заморожений).
   */
  public async syncYear(admissionYear: number): Promise<AdmissionSyncResult> {
    if (this.isSyncing) {
      throw new BadRequestException('Синхронізація вже виконується. Зачекайте завершення.')
    }
    const existing = await this.prisma.admissionCampaign.findUnique({
      where: { admissionYear },
    })
    if (existing?.status === AdmissionCampaignStatus.ARCHIVED) {
      throw new BadRequestException('Архівний рік заморожено — синхронізація недоступна.')
    }

    this.isSyncing = true
    const startedAt = new Date()
    try {
      await this.prisma.admissionCampaign.upsert({
        where: { admissionYear },
        create: { admissionYear, status: AdmissionCampaignStatus.ACTIVE },
        update: { status: AdmissionCampaignStatus.ACTIVE },
      })

      const offers = await this.fetchOffers()
      let applicationCount = 0

      for (const offer of offers) {
        if (offer.universitySpecialitiesId === null || offer.universitySpecialitiesId === undefined) {
          continue
        }
        const offerRow = await this.prisma.admissionOffer.upsert({
          where: {
            admissionYear_universitySpecialitiesId: {
              admissionYear,
              universitySpecialitiesId: offer.universitySpecialitiesId,
            },
          },
          create: { admissionYear, ...this.mapOffer(offer, startedAt) },
          update: this.mapOffer(offer, startedAt),
          select: { id: true },
        })

        try {
          applicationCount += await this.syncApplications(
            admissionYear,
            offerRow.id,
            offer.universitySpecialitiesId,
            startedAt,
          )
        } catch (err) {
          // Помилка однієї КП не валить решту знімка.
          this.logger.error(
            `Applications sync failed for offer ${offer.universitySpecialitiesId}`,
            err,
          )
        }
      }

      await this.prisma.admissionCampaign.update({
        where: { admissionYear },
        data: { lastSyncedAt: new Date() },
      })

      // Документи про освіту для нових заочних вступників (best-effort — не валить sync).
      try {
        await this.fetchEntryEducationDocs(admissionYear)
      } catch (err) {
        this.logger.error(`Fetch entry education docs failed for ${admissionYear}`, err)
      }

      this.logger.log(
        `Admission sync ${admissionYear}: ${offers.length} offers, ${applicationCount} applications`,
      )
      return { admissionYear, offers: offers.length, applications: applicationCount }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Архівує рік: статус → ARCHIVED, ПД усіх заяв цього року вичищаються (NULL).
   * Ідемпотентно. Звітні поля лишаються.
   */
  public async archiveYear(admissionYear: number): Promise<{ purged: number }> {
    const campaign = await this.prisma.admissionCampaign.findUnique({ where: { admissionYear } })
    if (!campaign) {
      throw new BadRequestException('Кампанію за цей рік не знайдено.')
    }

    const piiNulls = Object.fromEntries(
      APPLICATION_PII_FIELDS.map((f) => [f, null]),
    ) as Prisma.AdmissionApplicationUpdateManyMutationInput

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.admissionApplication.updateMany({
        where: { admissionYear },
        data: piiNulls,
      })
      await tx.admissionCampaign.update({
        where: { admissionYear },
        data: { status: AdmissionCampaignStatus.ARCHIVED, piiPurgedAt: new Date() },
      })
      return updated.count
    })

    this.logger.log(`Admission year ${admissionYear} archived; PII purged for ${result} applications`)
    return { purged: result }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Пагіновано тягне всі КП закладу. */
  private async fetchOffers(): Promise<SpecialitiesListResponseDto[]> {
    const all: SpecialitiesListResponseDto[] = []
    for (let pageNo = 0; ; pageNo++) {
      const page = await this.entrance.specialitiesList({
        universityID: this.universityId,
        pageNo,
        pageSize: EDBO_PAGE_SIZE,
      })
      all.push(...page)
      if (page.length < EDBO_PAGE_SIZE) break
    }
    return all
  }

  /** Пагіновано тягне всі заяви однієї КП (усі статуси) та upsert-ить їх. */
  private async syncApplications(
    admissionYear: number,
    offerId: string,
    universitySpecialitiesId: number,
    syncedAt: Date,
  ): Promise<number> {
    let count = 0
    for (let pageNo = 0; ; pageNo++) {
      const page = await this.fetchApplicationsPage(universitySpecialitiesId, pageNo)
      for (const app of page) {
        // ЄДЕБО повертає personRequestId числом; наша колонка — String.
        if (app.personRequestId === null || app.personRequestId === undefined) continue
        const personRequestId = String(app.personRequestId)
        const data = this.mapApplication(app, offerId, admissionYear, syncedAt, personRequestId)
        await this.prisma.admissionApplication.upsert({
          where: { admissionYear_personRequestId: { admissionYear, personRequestId } },
          create: data,
          update: data,
        })
        count++
      }
      if (page.length < EDBO_PAGE_SIZE) break
    }
    return count
  }

  /**
   * Одна сторінка заяв КП. Якщо форма ключів ще невідома — визначає її, перебираючи
   * `LIST2_BODY_VARIANTS`, і кешує робочий індекс на весь sync.
   */
  private async fetchApplicationsPage(
    universitySpecialitiesId: number,
    pageNo: number,
  ): Promise<PersonRequestList2ResponseDto[]> {
    if (this.list2VariantIndex !== null) {
      const body = LIST2_BODY_VARIANTS[this.list2VariantIndex]!.build(
        universitySpecialitiesId,
        pageNo,
        EDBO_PAGE_SIZE,
      )
      return this.edbo.post<PersonRequestList2ResponseDto[]>(PERSON_REQUEST_LIST2_PATH, body)
    }

    // Discovery: перша сторінка першої КП — знайти робочу форму ключів.
    let lastErr: unknown = null
    for (let i = 0; i < LIST2_BODY_VARIANTS.length; i++) {
      const variant = LIST2_BODY_VARIANTS[i]!
      try {
        const result = await this.edbo.post<PersonRequestList2ResponseDto[]>(
          PERSON_REQUEST_LIST2_PATH,
          variant.build(universitySpecialitiesId, pageNo, EDBO_PAGE_SIZE),
        )
        this.list2VariantIndex = i
        this.logger.log(`personRequest/list2 body-форма визначена: «${variant.label}»`)
        return result
      } catch (err) {
        lastErr = err
      }
    }
    throw lastErr
  }

  private mapOffer(
    o: SpecialitiesListResponseDto,
    syncedAt: Date,
  ): Omit<Prisma.AdmissionOfferCreateInput, 'admissionYear'> {
    return {
      universitySpecialitiesId: o.universitySpecialitiesId ?? 0,
      universitySpecialitiesName: o.universitySpecialitiesName ?? null,
      specialityCode: o.specialityCode ?? null,
      specialityName: o.specialityName ?? null,
      specializationName: o.specializationName ?? null,
      qualificationGroupName: o.qualificationGroupName ?? null,
      educationBaseName: o.educationBaseName ?? null,
      educationFormName: o.educationFormName ?? null,
      courseName: o.courseName ?? null,
      offerTypeName: o.universitySpecialitiesTypeName ?? null,
      maxOrder: o.maxOrder ?? null,
      budgetOrder: o.order ?? null,
      minOrder: o.minOrder ?? null,
      totalOrder: o.totalOrder ?? null,
      orderContract: o.orderContract ?? null,
      orderLicense: o.orderLicense ?? null,
      educationPrice: o.educationPrice ?? null,
      currencyName: o.currencyName ?? null,
      personRequestDateStart: toDate(o.personRequestDateStart),
      personRequestDateEnd: toDate(o.personRequestDateEnd),
      programNames: o.programNames ?? null,
      raw: o as unknown as Prisma.InputJsonValue,
      syncedAt,
    }
  }

  private mapApplication(
    a: PersonRequestList2ResponseDto,
    offerId: string,
    admissionYear: number,
    syncedAt: Date,
    personRequestId: string,
  ): Prisma.AdmissionApplicationUncheckedCreateInput {
    return {
      offerId,
      admissionYear,
      personRequestId,
      personCodeU: a.personCodeU ?? null,
      // Звітні поля (ЄДЕБО віддає statusTypeId числом — приводимо до String)
      statusTypeId:
        a.personRequestStatusTypeId !== null && a.personRequestStatusTypeId !== undefined
          ? String(a.personRequestStatusTypeId)
          : null,
      statusTypeName: a.personRequestStatusTypeName ?? null,
      konkursValue: a.konkursValue ?? null,
      requestPriority: a.requestPriority ?? null,
      enrollPriority: a.enrollPriority ?? null,
      enrollLevel: a.enrollLevel ?? null,
      isEz: a.isEz ?? null,
      isClaimForBudget: a.isClaimForBudget ?? null,
      isClaimForContract: a.isClaimForContract ?? null,
      isGraduateOneYear: a.isGraduateOneYear ?? null,
      isAdditionalExam: a.isAdditionalExam ?? null,
      isBudgetEducation: a.isBudgetEducation ?? null,
      isAnotherBudgetAllowed: a.isAnotherBudgetAllowed ?? null,
      isSimiliarSpeciality: a.isSimiliarSpeciality ?? null,
      isInterviewSuccess: a.isInterviewSuccess ?? null,
      informationOriginalDocumentLocation: a.informationOriginalDocumentLocation ?? null,
      budgetRecommendationTypeId: a.budgetRecommendationTypeId ?? null,
      contractRecommendationTypeId: a.contractRecommendationTypeId ?? null,
      algRecommendationTypeId: a.algRecommendationTypeId ?? null,
      isOriginalDocumentsAdded: a.isOriginalDocumentsAdded ?? null,
      isConfirmedContract: a.isConfirmedContract ?? null,
      isSignedDecision: a.isSignedDecision ?? null,
      documentAwardTypeId: a.documentAwardTypeId ?? null,
      foreignTypeId: a.foreignTypeId ?? null,
      countryId: a.countryId ?? null,
      orderOfEnrollmentId: a.orderOfEnrollmentId ?? null,
      dateCreate: toDate(a.dateCreate),
      dateLastChange: toDate(a.dateLastChange),
      // ПД (лише активна кампанія)
      fio: a.fio ?? null,
      birthday: toDate(a.birthday),
      personSexName: a.personSexName ?? null,
      phone: a.phone ?? null,
      email: a.email ?? null,
      documentTypeId: a.documentTypeId ?? null,
      documentSeries: a.documentSeries ?? null,
      documentNumbers: a.documentNumbers ?? null,
      documentIssued: a.documentIssued ?? null,
      documentDateGet: toDate(a.documentDateGet),
      personalCode: a.personalCode ?? null,
      syncedAt,
    }
  }
}
