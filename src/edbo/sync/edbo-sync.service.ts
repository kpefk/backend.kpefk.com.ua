import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'

import { PrismaService } from '@/prisma/prisma.service'
import { EdboService, EdboPersonDocument } from '@/edbo/core/edbo.service'
import { GroupsService } from '@/groups/groups.service'

import { SyncStateService, SYNC_KEYS } from './sync-state.service'

// ── Типи відповіді ЄДЕБО API: освітні програми ───────────────────

interface EdboStudyProgramRecord {
  universityStudyProgramId: number
  studyProgramName: string
  studyProgramNameEn: string | null
  qualificationGroupId: number | null
  qualificationGroupName: string | null
  specialityId: number | null
  specialityName: string | null
  universitySpecializationId: number | null
  specializationName: string | null
  isBlocked: boolean
  dateLastChange: string | null
}

interface EdboStudyProgramListParams {
  universityId: number
  pageNo: number
  pageSize: number
}

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

// ── Результат синхронізації ───────────────────────────────────────

export interface SyncResult {
  created: number
  updated: number
  /** Пропущено: modifyDate не змінився з часу останнього sync */
  skipped: number
  total: number
}

// ── Константи пагінації ───────────────────────────────────────────

/** Фіксований розмір сторінки для /api/studentEducations/list */
const STUDENT_PAGE_SIZE = 1000

/** Розмір сторінки для /api/university/staff/list */
const STAFF_PAGE_SIZE = 100

/**
 * Overlap-вікно в мілісекундах, що віднімається від lastSyncDate при порівнянні.
 * Компенсує можливу різницю годинників між нашим сервером і ЄДЕБО,
 * затримки запису на стороні ЄДЕБО і граничні випадки при точному збігу часу.
 */
const SYNC_OVERLAP_MS = 10 * 60 * 1000 // 10 хвилин

// ── Сервіс ────────────────────────────────────────────────────────

@Injectable()
export class EdboSyncService {
  private readonly logger = new Logger(EdboSyncService.name)
  private readonly universityId: number

  public constructor(
    private readonly prisma: PrismaService,
    private readonly edboService: EdboService,
    private readonly configService: ConfigService,
    private readonly groupsService: GroupsService,
    private readonly syncStateService: SyncStateService,
  ) {
    this.universityId = Number(this.configService.getOrThrow<string>('EDEBO_CODE'))
  }

  // ── Cron ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  public async scheduledSync(): Promise<void> {
    this.logger.log('Scheduled ЄДЕБО sync started')

    const [students, staff, docs] = await Promise.allSettled([
      this.syncStudents(),
      this.syncStaff(),
      this.syncStudentDocuments(),
    ])

    if (students.status === 'fulfilled') {
      const r = students.value
      this.logger.log(`Students: created=${r.created} updated=${r.updated} skipped=${r.skipped} total=${r.total}`)
    } else {
      this.logger.error('Students sync failed', students.reason)
    }

    if (staff.status === 'fulfilled') {
      const r = staff.value
      this.logger.log(`Staff: created=${r.created} updated=${r.updated} skipped=${r.skipped} total=${r.total}`)
    } else {
      this.logger.error('Staff sync failed', staff.reason)
    }

    if (docs.status === 'fulfilled') {
      this.logger.log(`Documents: synced=${docs.value}`)
    } else {
      this.logger.error('Documents sync failed', docs.reason)
    }
  }

  // ── Публічні методи синхронізації ────────────────────────────────

  /**
   * Синхронізує студентів з ЄДЕБО з підтримкою інкрементального оновлення.
   *
   * Інкрементальна логіка:
   * - Читає `students_last_sync_at` з таблиці sync_state
   * - Записи, у яких `modifyDate` відсутній або `modifyDate <= (lastSyncDate - 10хв)`, пропускаються
   * - При пропуску не виконуються ні UPDATE у БД, ні виклик `getPersonDocumentsSync()`
   * - `students_last_sync_at` оновлюється лише після повністю успішного завершення
   * - При помилці дата не оновлюється — наступний запуск повторить обробку
   *
   * @param fromDate — опціональний ручний override дати (для адмін-панелі)
   */
  public async syncStudents(fromDate?: string): Promise<SyncResult> {
    this.logger.log('Syncing students from ЄДЕБО...')

    // Визначаємо поріг для інкрементальної sync
    // Зберігаємо час початку обробки — це буде нова lastSyncDate після успіху
    const syncStartedAt = new Date()
    const thresholdDate = this.resolveThreshold(
      fromDate ?? null,
      await this.syncStateService.getDate(SYNC_KEYS.STUDENTS),
    )

    const result: SyncResult = { created: 0, updated: 0, skipped: 0, total: 0 }
    let pageNo = 0

    while (true) {
      const records = await this.edboService.post<EdboStudentRecord[]>(
        '/api/studentEducations/list',
        {
          universityId: this.universityId,
          qualificationGroupId: 9, // 9 = Фаховий молодший бакалавр
          historyFilterId: 1,      // 1 = навчаються
          pageNo,
          pageSize: STUDENT_PAGE_SIZE,
        } satisfies EdboStudentListParams,
      )

      if (!records?.length) break

      for (const record of records) {
        // ── Інкрементальний skip ───────────────────────────────────
        // Якщо modifyDate відомий і не перевищує threshold — запис не змінився.
        // Пропускаємо і DB-write, і виклик getPersonDocumentsSync().
        if (thresholdDate && record.modifyDate) {
          if (new Date(record.modifyDate) <= thresholdDate) {
            result.skipped++
            continue
          }
        }

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
      `Students sync done: total=${result.total}, created=${result.created}, updated=${result.updated}, skipped=${result.skipped}`,
    )

    // Синхронізуємо групи на основі оновленого знімку студентів
    const studentsSnapshot = await this.prisma.student.findMany({
      where: { universityId: this.universityId },
      select: { id: true, educationId: true, groupName: true, groupId: true },
    })

    const groupsResult = await this.groupsService.syncFromStudents(studentsSnapshot)
    this.logger.log(
      `Groups sync done: total=${groupsResult.total}, new=${groupsResult.created}, moves=${groupsResult.moves}`,
    )

    // Оновлюємо lastSyncDate тільки після повністю успішного завершення.
    // Використовуємо syncStartedAt, а не "зараз", щоб не пропустити записи,
    // змінені у ЄДЕБО під час тривалої обробки поточного sync.
    await this.syncStateService.setDate(SYNC_KEYS.STUDENTS, syncStartedAt)

    return result
  }

  /**
   * Синхронізує викладачів (staff) з ЄДЕБО з підтримкою інкрементального оновлення.
   *
   * Інкрементальна логіка аналогічна syncStudents, але використовує
   * `dateLastChange` замість `modifyDate` та ключ `staff_last_sync_at`.
   *
   * @param fromDate — опціональний ручний override дати (для адмін-панелі)
   */
  public async syncStaff(fromDate?: string): Promise<SyncResult> {
    this.logger.log('Syncing staff from ЄДЕБО...')

    const syncStartedAt = new Date()
    const thresholdDate = this.resolveThreshold(
      fromDate ?? null,
      await this.syncStateService.getDate(SYNC_KEYS.STAFF),
    )

    const result: SyncResult = { created: 0, updated: 0, skipped: 0, total: 0 }
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
        // ── Інкрементальний skip ───────────────────────────────────
        if (thresholdDate && record.dateLastChange) {
          if (new Date(record.dateLastChange) <= thresholdDate) {
            result.skipped++
            continue
          }
        }

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
      `Staff sync done: total=${result.total}, created=${result.created}, updated=${result.updated}, skipped=${result.skipped}`,
    )

    await this.syncStateService.setDate(SYNC_KEYS.STAFF, syncStartedAt)

    return result
  }

  /**
   * Синхронізує документи студентів, що не мають їх у БД.
   * Обробляє до 100 студентів за один запуск, щоб не перевантажувати ЄДЕБО API.
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

  // ── Синхронізація освітніх програм ──────────────────────────────

  /** Розмір сторінки для universityStudyPrograms/list */
  private static readonly STUDY_PROGRAM_PAGE_SIZE = 100

  /**
   * Синхронізує освітні програми з ЄДЕБО до локальної БД.
   *
   * Логіка:
   * - Запитує `POST /api/universityStudyPrograms/list` з universityId з EDEBO_CODE
   * - Для кожного запису визначає або створює відповідну локальну Specialty
   *   (за edeboSpecialityId → за назвою → новий запис)
   * - Upsert EducationalProgram за стабільним ЄДЕБО-ключем universityStudyProgramId
   * - Помічає syncedAt після кожного запису
   */
  public async syncStudyPrograms(): Promise<SyncResult> {
    this.logger.log('Syncing study programs (ОПП) from ЄДЕБО...')

    const result: SyncResult = { created: 0, updated: 0, skipped: 0, total: 0 }
    let pageNo = 0

    while (true) {
      const records = await this.edboService.post<EdboStudyProgramRecord[]>(
        '/api/universityStudyPrograms/list',
        {
          universityId: this.universityId,
          pageNo,
          pageSize: EdboSyncService.STUDY_PROGRAM_PAGE_SIZE,
        } satisfies EdboStudyProgramListParams,
      )

      if (!records?.length) break

      for (const record of records) {
        // Resolve or create matching Specialty
        const specialtyId = await this.resolveSpecialtyForStudyProgram(record)

        if (!specialtyId) {
          this.logger.warn(
            `Cannot resolve specialty for program ${record.universityStudyProgramId} ` +
            `(specialityId=${record.specialityId}, name="${record.specialityName}") — skipping.`,
          )
          result.skipped++
          continue
        }

        const programData = {
          specialtyId,
          name: record.studyProgramName,
          studyProgramNameEn: record.studyProgramNameEn ?? null,
          qualificationName: record.qualificationGroupName ?? record.studyProgramName,
          qualificationLevel: record.qualificationGroupName ?? null,
          qualificationGroupId: record.qualificationGroupId ?? null,
          universitySpecializationId: record.universitySpecializationId ?? null,
          specializationName: record.specializationName ?? null,
          isActive: !record.isBlocked,
          syncedAt: new Date(),
        }

        const existing = await this.prisma.educationalProgram.findUnique({
          where: { edeboId: record.universityStudyProgramId },
        })

        if (existing) {
          await this.prisma.educationalProgram.update({
            where: { id: existing.id },
            data: programData,
          })
          result.updated++
        } else {
          await this.prisma.educationalProgram.create({
            data: {
              ...programData,
              edeboId: record.universityStudyProgramId,
            },
          })
          result.created++
        }
      }

      result.total += records.length
      if (records.length < EdboSyncService.STUDY_PROGRAM_PAGE_SIZE) break
      pageNo++
    }

    this.logger.log(
      `Study programs sync done: total=${result.total}, created=${result.created}, ` +
      `updated=${result.updated}, skipped=${result.skipped}`,
    )

    return result
  }

  /**
   * Знаходить або створює запис Specialty для освітньої програми з ЄДЕБО.
   *
   * Пріоритети:
   * 1. Точний збіг за edeboSpecialityId
   * 2. Точний збіг за назвою (case-insensitive) → оновлює edeboSpecialityId якщо відсутній
   * 3. Створення нового запису з кодом `EDEBO-{specialityId}`
   * 4. null — якщо немає ані specialityId, ані specialityName для ідентифікації
   */
  private async resolveSpecialtyForStudyProgram(
    record: EdboStudyProgramRecord,
  ): Promise<string | null> {
    const { specialityId, specialityName } = record

    // 1. Пошук за ЄДЕБО-кодом спеціальності
    if (specialityId !== null && specialityId !== undefined) {
      const byEdeboId = await this.prisma.specialty.findFirst({
        where: { edeboSpecialityId: specialityId },
      })
      if (byEdeboId) return byEdeboId.id
    }

    // 2. Пошук за назвою (для вже засіяних спеціальностей)
    if (specialityName) {
      const byName = await this.prisma.specialty.findFirst({
        where: { name: { equals: specialityName, mode: 'insensitive' } },
      })
      if (byName) {
        // Прив'язуємо edeboSpecialityId до знайденої локальної спеціальності
        if (specialityId !== null && specialityId !== undefined && !byName.edeboSpecialityId) {
          await this.prisma.specialty.update({
            where: { id: byName.id },
            data: { edeboSpecialityId: specialityId },
          })
        }
        return byName.id
      }
    }

    // 3. Створюємо новий запис якщо є достатньо даних
    if (specialityId !== null && specialityId !== undefined && specialityName) {
      const created = await this.prisma.specialty.create({
        data: {
          code: `EDEBO-${specialityId}`,
          name: specialityName,
          edeboSpecialityId: specialityId,
          isActive: true,
        },
      })
      return created.id
    }

    return null
  }

  // ── Маппінг ───────────────────────────────────────────────────────

  private extractDocumentFields(documents: EdboPersonDocument[]): {
    rnokpp?: string
    passportSeries?: string
    passportNumbers?: string
    studentTicketSeries?: string
    studentTicketNumbers?: string
  } {
    const result: {
      rnokpp?: string
      passportSeries?: string
      passportNumbers?: string
      studentTicketSeries?: string
      studentTicketNumbers?: string
    } = {}

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

  /**
   * Обчислює поріг для інкрементального skip.
   *
   * Пріоритети:
   * 1. Якщо передано ручний `fromDate` — використовуємо його без overlap
   *    (адмін свідомо задає діапазон)
   * 2. Якщо є збережений `lastSyncDate` — віднімаємо SYNC_OVERLAP_MS для надійності
   * 3. Якщо sync запускається вперше — повертаємо null (обробляємо всі записи)
   */
  private resolveThreshold(fromDate: string | null, lastSyncDate: Date | null): Date | null {
    if (fromDate) return new Date(fromDate)
    if (lastSyncDate) return new Date(lastSyncDate.getTime() - SYNC_OVERLAP_MS)
    return null
  }
}
