import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'

import { PrismaService } from '@/prisma/prisma.service'
import { EdboService } from '@/edbo/core/edbo.service'

// ── Типи відповіді ЄДЕБО API ──────────────────────────────────────

interface EdboStudentRecord {
  educationId: number
  personId: number
  personCodeU: string
  educationHistoryActualId: number
  dateBegin: string
  dateEnd: string
  historyTypeId: number
  personEducationHistoryTypeName: string
  personName: string
  personFIO: string
  birthday: string
  personNameEn: string
  personSexId: number
  personSexName: string
  isUkr: boolean
  licenseYear: number
  educationDateBegin: string
  educationDateEnd: string
  facultyName: string
  qualificationGroupId: number
  qualificationGroupName: string
  baseQualificationName: string
  educationFormId: number
  educationFormName: string
  isDualForm: boolean
  personEducationPaymentTypeName: string
  isLegalEntityPayment: boolean
  budgetYear: number
  isRegionGovernanceOrder: number
  isSecondHigher: boolean
  isShortTerm: boolean
  fullSpecialityName: string
  specializationName: string
  centralSpecializationId: number
  universityStudyProgramId: number
  studyProgramName: string
  studyProgramNameEn: string
  masterProgramTypeShortName: string
  eduProgramChooseDate: string
  professionInfo: string
  courseId: number
  courseName: string
  groupName: string
  isExistsGrantRequest: boolean
  privilegeCategory: string
  isDocEducationExists: boolean
  isDocStudTicketExists: boolean
  isDocAcademExists: boolean
  isDocAcademGeneratedExists: boolean
  academicMobilityList: string
  expelEducationTypeName: string
  academicLeaveTypeName: string
  universityIdFrom: number
  univNameFrom: string
  isWithoutPzso: boolean
  modifyDate: string
  enrollInfo: string
  orderOfEnrollmentId: number
  foreignEnrollInfo: string
  foreignOrderOfEnrollmentId: number
  orderStatusDiploma: string
  orderStatusTicket: string
  orderStatusSvid: string
  eduEndFIO: string
  alienId: number
  alienCount: number
  foreignTypeId: number
  foreignTypeName: string
  budgetTransferCategoryId: number
  budgetTransferCategoryName: string
  konkursValue: number
  sourceTypeName: string
  isForPhdRenewal: boolean
}

interface EdboStaffRecord {
  staffId: number
  positionName: string
  adminPositionName: string
  scientificPositionName: string
  universityFacultyId: number
  universityFacultyShortName: string
  universityFacultyFullName: string
  universityFacultyChairId: number
  universityFacultyChairShortName: string
  universityFacultyChairFullName: string
  positionPluralityName: string
  staffRate: number
  personFio: string
  personBirthday: string
  personCountry: string
  personSex: string
  personId: number
  personCode: string
  personInfo: string
  dateRecruit: string | null
  dateFire: string | null
  startDate: string | null
  stageTypeId: number | null
  stageTypeName: string | null
  stage: number | null
  isStageSolid: boolean | null
  positionPlace: string | null
  coursesInfo: string | null
  profession: string | null
  dignityIdsStr: string | null
  dignityIds: number[]
  dignityNames: string | null
  skillId: number | null
  skillName: string | null
  rang: string | null
  educationInfo: string | null
  academicTitleAndDegree: string | null
  infoScience: string | null
  infoIndicator: string | null
  isActive: number
  dateLastChange: string | null
  personLastName: string
  personFirstName: string
  personMiddleName: string | null
}

// ── Параметри запитів ─────────────────────────────────────────────

interface EdboStudentListParams {
  universityId: number
  qualificationGroupId?: number
  historyFilterId: number
  pageNo: number
  pageSize: number
}

interface EdboStaffListParams {
  universityId: number
  activeId: number
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
    this.universityId = Number(this.configService.getOrThrow<string>('EDEBO_CODE'))
  }

  // ── Cron ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  public async scheduledSync(): Promise<void> {
    const fromDate = this.getYesterdayIso()
    this.logger.log(`Scheduled ЄДЕБО sync started (fromDate: ${fromDate})`)

    const [students, staff, docs] = await Promise.allSettled([
      this.syncStudents(fromDate),
      this.syncStaff(fromDate),
      this.syncStudentDocuments(),
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

    if (docs.status === 'fulfilled') {
      this.logger.log(`Student documents sync completed: ${docs.value}`)
    } else {
      this.logger.error('Student documents sync failed', docs.reason)
    }
  }

  // ── Публічні методи синхронізації ────────────────────────────────

  public async syncStudents(fromDate?: string): Promise<SyncResult> {
    this.logger.log('Syncing students from ЄДЕБО...')

    const result: SyncResult = { created: 0, updated: 0, total: 0 }
    let pageNo = 0

    while (true) {
      const records = await this.edboService.post<EdboStudentRecord[]>(
        '/api/studentEducations/list',
        {
          universityId: this.universityId,
          /*
            Освітній ступінь
              1 - Бакалавр
              2 - Магістр
              3 - Спеціаліст
              4 - Молодший спеціаліст
              5 - Кваліфікований робітник
              6 - Молодший бакалавр
              7 - Доктор філософії
              8 - Доктор наук
              9 - Фаховий молодший бакалавр
              10 - Доктор мистецтва
          */
          qualificationGroupId: 9, // 9 = фаховий молодший бакалавр
          historyFilterId: 1, // 1 = навчаються
          pageNo,
          pageSize: STUDENT_PAGE_SIZE,
        } satisfies EdboStudentListParams,
      )

      if (!records?.length) break

      for (const record of records) {
        const existing = await this.prisma.student.findFirst({
          where: {
            personId: record.personId,
            universityId: this.universityId,
          },
        })

        const studentData = this.mapStudentData(record)

        // 1. Отримуємо документи студента
        const documents = await this.edboService.getPersonDocumentsSync(record.personCodeU)

        // 2. Витягуємо конкретні типи документів
        const documentData = this.extractDocumentFields(documents)

        // 3. Об'єднуємо дані студента з документами
        const dataWithDocuments = {
          ...studentData,
          ...documentData,
        }

        if (existing) {
          await this.prisma.student.update({
            where: { id: existing.id },
            data: dataWithDocuments,
          })
          result.updated++
        } else {
          await this.prisma.student.create({
            data: { ...dataWithDocuments, userId: undefined },
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

  /**
   * Синхронізує документи студентів, що не мають їх у БД.
   * Проходить по студентам без документів або з пустим документів,
   * отримує їх з ЄДЕБО API та записує конкретні поля.
   *
   * @returns Кількість студентів, документи яких були синхронізовані
   */
  public async syncStudentDocuments(): Promise<number> {
    this.logger.log('Syncing student documents from ЄДЕБО...')

    const allStudents = await this.prisma.student.findMany({
      select: {
        id: true,
        personCodeU: true,
        rnokpp: true,
        passportSeries: true,
        passportNumbers: true,
        studentTicketSeries: true,
        studentTicketNumbers: true,
      },
      take: 100, // Обмежуємо до 100 за раз щоб не перевантажувати API
    })

    // Фільтруємо студентів без документів (всі поля null/empty)
    const studentsWithoutDocs = allStudents.filter(
      s =>
        !s.rnokpp &&
        !s.passportSeries &&
        !s.passportNumbers &&
        !s.studentTicketSeries &&
        !s.studentTicketNumbers
    )

    if (studentsWithoutDocs.length === 0) {
      this.logger.log('No students without documents found')
      return 0
    }

    this.logger.log(`Found ${studentsWithoutDocs.length} students without documents`)

    let synced = 0

    for (const student of studentsWithoutDocs) {
      try {
        const documents = await this.edboService.getPersonDocumentsSync(student.personCodeU)

        if (documents && documents.length > 0) {
          const documentData = this.extractDocumentFields(documents)

          if (
            documentData.rnokpp ||
            documentData.passportSeries ||
            documentData.passportNumbers ||
            documentData.studentTicketSeries ||
            documentData.studentTicketNumbers
          ) {
            await this.prisma.student.update({
              where: { id: student.id },
              data: documentData,
            })
            synced++
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to sync documents for student ${student.id}:`, error)
      }
    }

    this.logger.log(`Student documents sync done: ${synced}/${studentsWithoutDocs.length}`)
    return synced
  }

  public async syncStaff(fromDate?: string): Promise<SyncResult> {
    this.logger.log('Syncing staff from ЄДЕБО...')

    const result: SyncResult = { created: 0, updated: 0, total: 0 }
    let pageNo = 0

    while (true) {
      const records = await this.edboService.post<EdboStaffRecord[]>(
        '/api/university/staff/list',
        {
          universityId: this.universityId,
          activeId: 1, // 1 = лише працюючі
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

  /**
   * Витягує конкретні типи документів з масиву документів ЄДЕБО
   * та відображає їх на поля Student моделі.
   *
   * @param documents Масив документів від ЄДЕБО API
   * @returns Об'єкт з полями для збереження у БД
   */
  private extractDocumentFields(documents: any[]): {
    rnokpp?: string
    passportSeries?: string
    passportNumbers?: string
    studentTicketSeries?: string
    studentTicketNumbers?: string
  } {
    const result: any = {}

    for (const doc of documents) {
      // 5 = РНОКПП
      if (doc.idPersonDocumentType === 5 && doc.documentNumbers) {
        result.rnokpp = doc.documentNumbers
      }

      // 16 = Студентський квиток
      if (doc.idPersonDocumentType === 16) {
        if (doc.documentSeries) result.studentTicketSeries = doc.documentSeries
        if (doc.documentNumbers) result.studentTicketNumbers = doc.documentNumbers
      }

      // 36 = Паспорт громадянина України
      if (doc.idPersonDocumentType === 36) {
        if (doc.documentSeries) result.passportSeries = doc.documentSeries
        if (doc.documentNumbers) result.passportNumbers = doc.documentNumbers
      }
    }

    return result
  }

  private mapStudentData(r: EdboStudentRecord) {
    return {
      personId: r.personId,
      universityId: this.universityId,
      educationId: r.educationId,
      personCodeU: r.personCodeU,
      educationHistoryActualId: r.educationHistoryActualId,
      dateBegin: r.dateBegin ? new Date(r.dateBegin) : null,
      dateEnd: r.dateEnd ? new Date(r.dateEnd) : null,
      historyTypeId: r.historyTypeId,
      personFIO: r.personFIO,
      birthday: r.birthday ? new Date(r.birthday) : null,
      personSexName: r.personSexName,
      licenseYear: r.licenseYear,
      educationDateBegin: r.educationDateBegin ? new Date(r.educationDateBegin) : null,
      educationDateEnd: r.educationDateEnd ? new Date(r.educationDateEnd) : null,
      facultyName: r.facultyName,
      qualificationGroupId: r.qualificationGroupId,
      qualificationGroupName: r.qualificationGroupName,
      educationFormId: r.educationFormId,
      educationFormName: r.educationFormName,
      isDualForm: r.isDualForm,
      isSecondHigher: r.isSecondHigher,
      isShortTerm: r.isShortTerm,
      fullSpecialityName: r.fullSpecialityName,
      universityStudyProgramId: r.universityStudyProgramId,
      studyProgramName: r.studyProgramName,
      professionInfo: r.professionInfo,
      courseId: r.courseId,
      courseName: r.courseName,
      groupName: r.groupName,
      expelEducationTypeName: r.expelEducationTypeName,
      academicLeaveTypeName: r.academicLeaveTypeName,
      modifyDate: r.modifyDate ? new Date(r.modifyDate) : null,
      foreignTypeId: r.foreignTypeId,
      foreignTypeName: r.foreignTypeName,
      budgetTransferCategoryId: r.budgetTransferCategoryId,
      budgetTransferCategoryName: r.budgetTransferCategoryName,
      isForPhdRenewal: r.isForPhdRenewal,
    }
  }

  private mapStaffData(r: EdboStaffRecord) {
    return {
      staffId: r.staffId,
      personId: r.personId,
      lastName: r.personLastName,
      firstName: r.personFirstName,
      middleName: r.personMiddleName,
      birthday: r.personBirthday ? new Date(r.personBirthday) : null,
      countryName: r.personCountry,
      personSexName: r.personSex,
      isActive: r.isActive === 1,
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
      modifyDate: r.dateLastChange ? new Date(r.dateLastChange) : null,
    }
  }

  // ── Утиліти ───────────────────────────────────────────────────────

  private getYesterdayIso(): string {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return date.toISOString()
  }
}