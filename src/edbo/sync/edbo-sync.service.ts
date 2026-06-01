import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'

import { PrismaService } from '@/prisma/prisma.service'
import { EdboService } from '@/edbo/core/edbo.service'

// ── Типи відповіді ЄДЕБО API ──────────────────────────────────────

interface EdboStudentRecord {
  universityId: number
  personId: number
  listenerId: number
  lastName: string
  firstName: string
  middleName: string
  birthday: string
  countryName: string
  personSexName: string
  rnokpp: string
  unzr: string
  passportDocumentTypeId: number
  passportDocumentTypeName: string
  passportDocumentSeries: string
  passportDocumentNumbers: string
  passportDocumentIssuedDate: string
  passportDocumentExpiredDate: string
  professionClassifierCode1: string
  professionName1: string
  professionRangName1: string
  professionClassifierCode2: string
  professionName2: string
  professionRangName2: string
  professionClassifierCode3: string
  professionName3: string
  professionRangName3: string
  professionClassifierCode4: string
  professionName4: string
  professionRangName4: string
  professionClassifierCode5: string
  professionName5: string
  professionRangName5: string
  educationFormName: string
  isDual: boolean
  educationDateBegin: string
  reason: string
  educationDateEnd: string
  modifyDate: string
}

interface EdboStaffRecord {
  universityId: number
  personId: number
  staffId: number
  lastName: string
  firstName: string
  middleName: string | null
  birthday: string
  countryId: number | null
  countryName: string | null
  personSexName: string | null
  rnokpp: string | null
  unzr: string | null
  passportDocumentTypeId: number | null
  passportDocumentTypeName: string | null
  passportDocumentSeries: string | null
  passportDocumentNumbers: string | null
  passportDocumentDateGet: string | null
  passportDocumentExpiredDate: string | null
  isActive: boolean
  positionName: string | null
  positionPluralityName: string | null
  positionPlace: string | null
  universityFacultyId: number | null
  universityFacultyFullName: string | null
  universityFacultyShortName: string | null
  universityFacultyChairId: number | null
  universityFacultyChairFullName: string | null
  universityFacultyChairShortName: string | null
  profession: string | null
  rang: string | null
  pedagogicTitleId: string | null
  pedagogicTitleName: string | null
  skillId: number | null
  skillName: string | null
  stageTypeId: number | null
  stageTypeName: string | null
  stage: number | null
  isStageSolid: boolean | null
  startDate: string | null
  dateRecruit: string | null
  dateFire: string | null
  coursesInfo: string | null
  modifyDate: string | null
}

// ── Параметри запитів — окремо для кожного API ───────────────────

interface EdboStudentListParams {
  universityId: number
  isActive?: boolean
  fromDate?: string
  pageNo: number
}

interface EdboStaffListParams {
  universityId: number
  isActive?: boolean
  fromDate?: string
  pageNo: number
  pageSize: number
}

export interface SyncResult {
  created: number
  updated: number
  total: number
}

// ── Константи пагінації ───────────────────────────────────────────

/** Фіксований розмір сторінки для /api/listener/listExternal */
const STUDENT_PAGE_SIZE = 1000

/** Розмір сторінки для /api/university/staff/listExternal (максимальний) */
const STAFF_PAGE_SIZE = 100

// ── Сервіс ────────────────────────────────────────────────────────

@Injectable()
export class EdboSyncService {
  private readonly logger = new Logger(EdboSyncService.name)
  private readonly universityId: number

  public constructor(
    private readonly prisma: PrismaService,
    private readonly edboService: EdboService,
    private readonly configService: ConfigService,
  ) {
    this.universityId = this.configService.getOrThrow<number>('EDEBO_CODE')
  }

  // ── Cron ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  public async scheduledSync(): Promise<void> {
    const fromDate = this.getYesterdayIso()
    this.logger.log(`Scheduled ЄДЕБО sync started (fromDate: ${fromDate})`)

    const [students, staff] = await Promise.allSettled([
      this.syncStudents(fromDate),
      this.syncStaff(fromDate),
    ])

    if (students.status === 'fulfilled') {
      this.logger.log(`Students sync: +${students.value.created} / ~${students.value.updated}`)
    } else {
      this.logger.error('Students sync failed', students.reason)
    }

    if (staff.status === 'fulfilled') {
      this.logger.log(`Staff sync: +${staff.value.created} / ~${staff.value.updated}`)
    } else {
      this.logger.error('Staff sync failed', staff.reason)
    }
  }

  // ── Публічні методи синхронізації ────────────────────────────────

  public async syncStudents(fromDate?: string): Promise<SyncResult> {
    this.logger.log('Syncing students from ЄДЕБО...')

    const result: SyncResult = { created: 0, updated: 0, total: 0 }
    let pageNo = 0

    while (true) {
      const records = await this.edboService.post<EdboStudentRecord[]>(
        '/api/listener/listExternal',
        {
          universityId: this.universityId,
          isActive: true,
          fromDate,
          pageNo,
        } satisfies EdboStudentListParams,
      )

      if (!records?.length) break

      for (const record of records) {
        const existing = await this.prisma.student.findFirst({
          where: {
            personId: record.personId,
            universityId: record.universityId,
          },
        })

        if (existing) {
          await this.prisma.student.update({
            where: { id: existing.id },
            data: this.mapStudentData(record),
          })
          result.updated++
        } else {
          await this.prisma.student.create({
            data: { ...this.mapStudentData(record), userId: undefined },
          })
          result.created++
        }
      }

      result.total += records.length

      if (records.length < STUDENT_PAGE_SIZE) break
      pageNo++
    }

    this.logger.log(
      `Students sync done: total=${result.total}, created=${result.created}, updated=${result.updated}`,
    )

    return result
  }

  public async syncStaff(fromDate?: string): Promise<SyncResult> {
    this.logger.log('Syncing staff from ЄДЕБО...')

    const result: SyncResult = { created: 0, updated: 0, total: 0 }
    let pageNo = 0

    while (true) {
      const records = await this.edboService.post<EdboStaffRecord[]>(
        '/api/university/staff/listExternal',
        {
          universityId: this.universityId,
          isActive: true,
          fromDate,
          pageNo,
          pageSize: STAFF_PAGE_SIZE,
        } satisfies EdboStaffListParams,
      )

      if (!records?.length) break

      for (const record of records) {
        const existing = await this.prisma.teacher.findFirst({
          where: { staffId: record.staffId },
        })

        if (existing) {
          await this.prisma.teacher.update({
            where: { id: existing.id },
            data: this.mapStaffData(record),
          })
          result.updated++
        } else {
          await this.prisma.teacher.create({
            data: this.mapStaffData(record),
          })
          result.created++
        }
      }

      result.total += records.length

      if (records.length < STAFF_PAGE_SIZE) break
      pageNo++
    }

    this.logger.log(
      `Staff sync done: total=${result.total}, created=${result.created}, updated=${result.updated}`,
    )

    return result
  }

  // ── Маппінг ───────────────────────────────────────────────────────

  private mapStudentData(r: EdboStudentRecord) {
    return {
      universityId: r.universityId,
      personId: r.personId,
      listenerId: r.listenerId,
      lastName: r.lastName,
      firstName: r.firstName,
      middleName: r.middleName,
      birthday: new Date(r.birthday),
      countryName: r.countryName,
      personSexName: r.personSexName,
      rnokpp: r.rnokpp,
      unzr: r.unzr,
      passportDocumentTypeId: r.passportDocumentTypeId,
      passportDocumentTypeName: r.passportDocumentTypeName,
      passportDocumentSeries: r.passportDocumentSeries,
      passportDocumentNumbers: r.passportDocumentNumbers,
      passportDocumentIssuedDate: new Date(r.passportDocumentIssuedDate),
      passportDocumentExpiredDate: new Date(r.passportDocumentExpiredDate),
      professionClassifierCode1: r.professionClassifierCode1,
      professionName1: r.professionName1,
      professionRangName1: r.professionRangName1,
      professionClassifierCode2: r.professionClassifierCode2,
      professionName2: r.professionName2,
      professionRangName2: r.professionRangName2,
      professionClassifierCode3: r.professionClassifierCode3,
      professionName3: r.professionName3,
      professionRangName3: r.professionRangName3,
      professionClassifierCode4: r.professionClassifierCode4,
      professionName4: r.professionName4,
      professionRangName4: r.professionRangName4,
      professionClassifierCode5: r.professionClassifierCode5,
      professionName5: r.professionName5,
      professionRangName5: r.professionRangName5,
      educationFormName: r.educationFormName,
      isDual: r.isDual,
      educationDateBegin: new Date(r.educationDateBegin),
      reason: r.reason,
      educationDateEnd: new Date(r.educationDateEnd),
    }
  }

  private mapStaffData(r: EdboStaffRecord) {
    return {
      universityId: r.universityId,
      personId: r.personId,
      staffId: r.staffId,
      lastName: r.lastName,
      firstName: r.firstName,
      middleName: r.middleName,
      birthday: new Date(r.birthday),
      countryId: r.countryId,
      countryName: r.countryName,
      personSexName: r.personSexName,
      rnokpp: r.rnokpp,
      unzr: r.unzr,
      passportDocumentTypeId: r.passportDocumentTypeId,
      passportDocumentTypeName: r.passportDocumentTypeName,
      passportDocumentSeries: r.passportDocumentSeries,
      passportDocumentNumbers: r.passportDocumentNumbers,
      passportDocumentDateGet: r.passportDocumentDateGet
        ? new Date(r.passportDocumentDateGet)
        : null,
      passportDocumentExpiredDate: r.passportDocumentExpiredDate
        ? new Date(r.passportDocumentExpiredDate)
        : null,
      isActive: r.isActive,
      positionName: r.positionName,
      positionPluralityName: r.positionPluralityName,
      positionPlace: r.positionPlace,
      universityFacultyId: r.universityFacultyId,
      universityFacultyFullName: r.universityFacultyFullName,
      universityFacultyShortName: r.universityFacultyShortName,
      universityFacultyChairId: r.universityFacultyChairId,
      universityFacultyChairFullName: r.universityFacultyChairFullName,
      universityFacultyChairShortName: r.universityFacultyChairShortName,
      profession: r.profession,
      rang: r.rang,
      pedagogicTitleId: r.pedagogicTitleId,
      pedagogicTitleName: r.pedagogicTitleName,
      skillId: r.skillId,
      skillName: r.skillName,
      stageTypeId: r.stageTypeId,
      stageTypeName: r.stageTypeName,
      stage: r.stage,
      isStageSolid: r.isStageSolid,
      startDate: r.startDate ? new Date(r.startDate) : null,
      dateRecruit: r.dateRecruit ? new Date(r.dateRecruit) : null,
      dateFire: r.dateFire ? new Date(r.dateFire) : null,
      coursesInfo: r.coursesInfo,
    }
  }

  // ── Утиліти ───────────────────────────────────────────────────────

  private getYesterdayIso(): string {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return date.toISOString()
  }
}