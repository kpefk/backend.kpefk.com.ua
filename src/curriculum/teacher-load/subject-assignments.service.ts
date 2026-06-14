import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'

import type { LessonType, LoadDistributionMode, Prisma } from '@prisma/client'
import type { Request } from 'express'
import { randomUUID } from 'crypto'

import { PrismaService } from '@/prisma/prisma.service'

import type {
  ConfirmSubjectAssignmentsDto,
  ConfirmSubjectAssignmentsResultDto,
  LessonAssignmentDto,
  RevokeSubjectAssignmentsDto,
  RevokeSubjectAssignmentsResultDto,
  SetDistributionModeDto,
  SubjectAssignmentDto,
  TeacherRefDto,
  UpdateLessonAssignmentDto,
  UpdateSubjectAssignmentDto,
} from './dto/subject-assignment.dto'
import {
  MIN_SUBGROUP_SIZE,
  NORM_MAX_DISCIPLINES,
  NORM_TEACHING_HOURS_PER_RATE,
  teachingHoursLimit,
} from './teacher-load.constants'

// ─── Domain constants ─────────────────────────────────────────────────────────

/**
 * Типи занять, що ніколи не діляться на підгрупи (Наказ МОН №686 п.5–7).
 * SPRS — внутрішній показник закладу; також не ділиться на підгрупи.
 */
const STREAM_LESSON_TYPES = new Set<LessonType>([
  'LECTURE',
  'SEMINAR',
  'CONSULTATION',
  'SPRS',
])

// ─── Prisma includes ──────────────────────────────────────────────────────────

/** Поля викладача, необхідні для TeacherRefDto */
const TEACHER_SELECT = {
  id: true,
  lastName: true,
  firstName: true,
  middleName: true,
  positionName: true,
  universityFacultyChairShortName: true,
  universityFacultyChairFullName: true,
  rate: true,
} satisfies Prisma.TeacherSelect

const SUBJECT_INCLUDE = {
  primaryTeacher: { select: TEACHER_SELECT },
  group: { select: { id: true, name: true } },
  curriculumComponentTerm: {
    include: {
      component: {
        select: {
          id: true,
          code: true,
          name: true,
          section: { select: { orderIndex: true } },
          orderIndex: true,
        },
      },
    },
  },
  lessonAssignments: {
    include: { overrideTeacher: { select: TEACHER_SELECT } },
    orderBy: [
      { lessonType: 'asc' as const },
      { subgroupNumber: 'asc' as const },
    ],
  },
} satisfies Prisma.TeacherLoadSubjectAssignmentInclude

type SubjectRow = Prisma.TeacherLoadSubjectAssignmentGetPayload<{
  include: typeof SUBJECT_INCLUDE
}>

type TeacherSelectResult = Prisma.TeacherGetPayload<{ select: typeof TEACHER_SELECT }>

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SubjectAssignmentsService {
  private readonly logger = new Logger(SubjectAssignmentsService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Генерує DRAFT subject assignments із бюджету годин робочого плану.
   *
   * Правила розподілу:
   *  - LECTURE → stream subject (groupId = null) + один LECTURE lesson row
   *  - PRACTICE / LAB / SEMINAR / CONSULTATION / SPRS →
   *      stream subject (groupId = null);
   *      PRACTICE / LAB при subgroupCount >= 2 → окремий lesson row на кожну підгрупу
   *
   * Якщо DRAFT-записи вже існують — вони перегенеровуються.
   * primaryTeacher і overrideTeacher зберігаються.
   * CONFIRMED-записи ніколи не чіпаються.
   */
  public async generate(
    workingCurriculumId: string,
    userId: string,
  ): Promise<SubjectAssignmentDto[]> {
    this.logger.log(`Generating subject assignments for WC id=${workingCurriculumId}`)

    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id: workingCurriculumId },
      include: {
        componentTerms: {
          include: { componentTerm: { select: { id: true, subgroupCount: true } } },
          orderBy: [
            { componentTerm: { component: { section: { orderIndex: 'asc' } } } },
            { componentTerm: { component: { orderIndex: 'asc' } } },
            { componentTerm: { semesterNumber: 'asc' } },
          ],
        },
      },
    })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    const activeGroups = await this.prisma.groupCurriculumAssignment.findMany({
      where: { versionId: wc.versionId, isActive: true },
      select: { groupId: true },
    })
    const groupIds = activeGroups.map((g) => g.groupId)

    // Зберігаємо призначення з існуючих DRAFT
    const existingSubjects = await this.prisma.teacherLoadSubjectAssignment.findMany({
      where: { workingCurriculumId, status: 'DRAFT' },
      include: { lessonAssignments: { select: { lessonType: true, subgroupNumber: true, overrideTeacherId: true } } },
    })

    // savedPrimary: "${termId}:${groupId ?? 'stream'}" → primaryTeacherId
    const savedPrimary = new Map<string, string | null>()
    // savedOverride: "${termId}:${groupId ?? 'stream'}:${lessonType}:${subgroup}" → overrideTeacherId
    const savedOverride = new Map<string, string | null>()

    for (const sa of existingSubjects) {
      const sk = `${sa.curriculumComponentTermId}:${sa.groupId ?? 'stream'}`
      savedPrimary.set(sk, sa.primaryTeacherId)
      for (const la of sa.lessonAssignments) {
        if (la.overrideTeacherId !== null) {
          // ключ включає subgroupNumber щоб різнити підгрупи
          savedOverride.set(`${sk}:${la.lessonType}:${la.subgroupNumber ?? 'null'}`, la.overrideTeacherId)
        }
      }
    }

    // Будуємо нові рядки
    type SubjectInput = Prisma.TeacherLoadSubjectAssignmentCreateManyInput
    type LessonInput  = Prisma.TeacherLoadLessonAssignmentCreateManyInput

    const subjectRows: SubjectInput[] = []
    const lessonRows: LessonInput[]   = []

    // Додає lesson-рядки для типу заняття; PRACTICE/LAB з subgroupCount >= 2
    // розбиваються на підгрупи (окремий рядок на кожну) для різних викладачів.
    const pushLessons = (
      saId: string,
      sk: string,
      type: LessonType,
      hours: number,
      subgroupCount: number,
    ): void => {
      const canSplit = type === 'PRACTICE' || type === 'LAB'
      if (canSplit && subgroupCount >= 2) {
        for (let sg = 1; sg <= subgroupCount; sg++) {
          lessonRows.push({
            id:                  randomUUID(),
            subjectAssignmentId: saId,
            lessonType:          type,
            subgroupNumber:      sg,
            hours,
            overrideTeacherId:   savedOverride.get(`${sk}:${type}:${sg}`) ?? null,
          })
        }
      } else {
        lessonRows.push({
          id:                  randomUUID(),
          subjectAssignmentId: saId,
          lessonType:          type,
          subgroupNumber:      null,
          hours,
          overrideTeacherId:   savedOverride.get(`${sk}:${type}:null`) ?? null,
        })
      }
    }

    for (const wct of wc.componentTerms) {
      const termId = wct.componentTermId
      const year = wc.academicYear
      const subgroupCount = wct.componentTerm.subgroupCount ?? 1

      // ── Потоковий subject: лекції ────────────────────────────────────────────
      if (wct.lectureHours > 0) {
        const sk = `${termId}:stream`
        const saId = randomUUID()
        subjectRows.push({
          id:                        saId,
          workingCurriculumId,
          curriculumComponentTermId: termId,
          groupId:                   null,
          academicYear:              year,
          primaryTeacherId:          savedPrimary.get(sk) ?? null,
          assignedById:              userId,
          status:                    'DRAFT',
        })
        pushLessons(saId, sk, 'LECTURE', wct.lectureHours, subgroupCount)
      }

      // ── Потоковий subject: не-лекційні потокові типи ──────────────────────────
      // Семінари/консультації/СПРС — завжди потік. Практики/лаб — лише якщо їх
      // режим STREAM. PER_GROUP-практики/лаб ідуть нижче окремими subject'ами.
      const streamTypes: Array<[LessonType, number]> = [
        ['SEMINAR',      wct.seminarHours],
        ['CONSULTATION', wct.consultationHours],
        ['SPRS',         wct.independentHours],
      ]
      if (wct.practiceMode === 'STREAM') streamTypes.push(['PRACTICE', wct.practicalHours])
      if (wct.labMode === 'STREAM')      streamTypes.push(['LAB',      wct.labHours])
      const activeStreamTypes = streamTypes.filter(([, h]) => h > 0)

      if (activeStreamTypes.length > 0) {
        const sk = `${termId}:stream`
        const saId = randomUUID()
        subjectRows.push({
          id:                        saId,
          workingCurriculumId,
          curriculumComponentTermId: termId,
          groupId:                   null,
          academicYear:              year,
          primaryTeacherId:          savedPrimary.get(sk) ?? null,
          assignedById:              userId,
          status:                    'DRAFT',
        })
        for (const [type, hours] of activeStreamTypes) {
          pushLessons(saId, sk, type, hours, subgroupCount)
        }
      }

      // ── Per-group subjects: практики/лаб у режимі PER_GROUP ───────────────────
      // Окремий subject на кожну активну групу — щоб призначати різних викладачів.
      const perGroupTypes: Array<[LessonType, number]> = []
      if (wct.practiceMode === 'PER_GROUP' && wct.practicalHours > 0) {
        perGroupTypes.push(['PRACTICE', wct.practicalHours])
      }
      if (wct.labMode === 'PER_GROUP' && wct.labHours > 0) {
        perGroupTypes.push(['LAB', wct.labHours])
      }

      if (perGroupTypes.length > 0) {
        for (const gid of groupIds) {
          const sk = `${termId}:${gid}`
          const saId = randomUUID()
          subjectRows.push({
            id:                        saId,
            workingCurriculumId,
            curriculumComponentTermId: termId,
            groupId:                   gid,
            academicYear:              year,
            primaryTeacherId:          savedPrimary.get(sk) ?? null,
            assignedById:              userId,
            status:                    'DRAFT',
          })
          for (const [type, hours] of perGroupTypes) {
            pushLessons(saId, sk, type, hours, subgroupCount)
          }
        }
      }
    }

    // Транзакція: видаляємо DRAFT, вставляємо нові записи
    await this.prisma.$transaction(async (tx) => {
      await tx.teacherLoadSubjectAssignment.deleteMany({
        where: { workingCurriculumId, status: 'DRAFT' },
      })
      await tx.teacherLoadSubjectAssignment.createMany({ data: subjectRows })
      await tx.teacherLoadLessonAssignment.createMany({ data: lessonRows })
    })

    this.logger.log(
      `Generated ${subjectRows.length} subject + ${lessonRows.length} lesson rows for WC id=${workingCurriculumId}`,
    )
    return this.findAll(workingCurriculumId)
  }

  /** Повертає всі subject assignments для робочого плану в документному порядку. */
  public async findAll(workingCurriculumId: string): Promise<SubjectAssignmentDto[]> {
    const rows = await this.prisma.teacherLoadSubjectAssignment.findMany({
      where: { workingCurriculumId },
      include: SUBJECT_INCLUDE,
      orderBy: [
        { curriculumComponentTerm: { component: { section: { orderIndex: 'asc' } } } },
        { curriculumComponentTerm: { component: { orderIndex: 'asc' } } },
        { curriculumComponentTerm: { semesterNumber: 'asc' } },
        { group: { name: 'asc' } },
      ],
    })

    // Режими розподілу по ОК-семестрах робочого плану.
    const modeRows = await this.prisma.workingCurriculumComponentTerm.findMany({
      where: { workingCurriculumId },
      select: { componentTermId: true, practiceMode: true, labMode: true },
    })
    const modes = new Map(
      modeRows.map((m) => [m.componentTermId, { practiceMode: m.practiceMode, labMode: m.labMode }]),
    )

    return rows.map((r) =>
      this.mapSubjectToDto(r, [], modes.get(r.curriculumComponentTermId)),
    )
  }

  /**
   * Оновлює primaryTeacherId на рівні subject assignment.
   *
   * Lesson overrides не змінюються — effectiveTeacher для кожного lesson
   * перераховується автоматично (overrideTeacherId ?? новий primaryTeacherId).
   */
  public async updateSubject(
    id: string,
    dto: UpdateSubjectAssignmentDto,
    userId: string,
  ): Promise<SubjectAssignmentDto> {
    const existing = await this.prisma.teacherLoadSubjectAssignment.findUnique({
      where: { id },
      select: { id: true, status: true },
    })
    if (!existing) throw new NotFoundException('Subject assignment не знайдено.')
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException('Підтверджені записи не можна редагувати.')
    }

    const updated = await this.prisma.teacherLoadSubjectAssignment.update({
      where: { id },
      data: {
        ...(dto.primaryTeacherId !== undefined && { primaryTeacherId: dto.primaryTeacherId }),
        assignedById: userId,
      },
      include: SUBJECT_INCLUDE,
    })

    const modeRow = await this.prisma.workingCurriculumComponentTerm.findUnique({
      where: {
        workingCurriculumId_componentTermId: {
          workingCurriculumId: updated.workingCurriculumId,
          componentTermId: updated.curriculumComponentTermId,
        },
      },
      select: { practiceMode: true, labMode: true },
    })

    return this.mapSubjectToDto(updated, [], modeRow ?? undefined)
  }

  /**
   * Оновлює overrideTeacherId для конкретного виду заняття.
   *
   * Правило: якщо overrideTeacherId == primaryTeacherId батьківського subject —
   * override очищається до null (override на того самого викладача безглуздий).
   *
   * [HARD BLOCK] subgroupNumber ≠ null для LECTURE/SEMINAR/CONSULTATION/SPRS.
   * [SOFT WARN]  Менше 10 студентів у підгрупі (практ./лаб.).
   */
  public async updateLesson(
    id: string,
    dto: UpdateLessonAssignmentDto,
    userId: string,
  ): Promise<LessonAssignmentDto> {
    const lesson = await this.prisma.teacherLoadLessonAssignment.findUnique({
      where: { id },
      include: {
        subjectAssignment: {
          select: {
            status: true,
            primaryTeacherId: true,
            groupId: true,
            curriculumComponentTerm: {
              select: { subgroupCount: true },
            },
          },
        },
      },
    })
    if (!lesson) throw new NotFoundException('Lesson assignment не знайдено.')
    if (lesson.subjectAssignment.status === 'CONFIRMED') {
      throw new BadRequestException('Підтверджені записи не можна редагувати.')
    }

    // C3: заборона підгруп для потокових типів [HARD BLOCK]
    const newSubgroup = dto.subgroupNumber !== undefined
      ? dto.subgroupNumber
      : lesson.subgroupNumber

    if (newSubgroup !== null && STREAM_LESSON_TYPES.has(lesson.lessonType)) {
      throw new BadRequestException(
        `Тип заняття "${lesson.lessonType}" не підтримує поділ на підгрупи ` +
        `(Наказ МОН №686 п.5). Підгрупи допустимі лише для PRACTICE та LAB.`,
      )
    }

    // Якщо override == primary → очищаємо override до null (зайва надмірність)
    let resolvedOverrideId = dto.overrideTeacherId !== undefined
      ? dto.overrideTeacherId
      : lesson.overrideTeacherId

    if (
      resolvedOverrideId !== null &&
      resolvedOverrideId === lesson.subjectAssignment.primaryTeacherId
    ) {
      resolvedOverrideId = null
    }

    const updated = await this.prisma.teacherLoadLessonAssignment.update({
      where: { id },
      data: {
        ...(dto.overrideTeacherId !== undefined && { overrideTeacherId: resolvedOverrideId }),
        ...(dto.subgroupNumber !== undefined && { subgroupNumber: dto.subgroupNumber }),
      },
      include: { overrideTeacher: { select: TEACHER_SELECT } },
    })

    // R3: [SOFT WARN] мінімум студентів у підгрупі
    const warnings: string[] = []
    if (newSubgroup !== null && lesson.subjectAssignment.groupId !== null) {
      const studentCount = await this.prisma.student.count({
        where: { groupId: lesson.subjectAssignment.groupId },
      })
      const subgroupCount = lesson.subjectAssignment.curriculumComponentTerm.subgroupCount
      const perSubgroup = subgroupCount > 0
        ? Math.floor(studentCount / subgroupCount)
        : studentCount
      if (perSubgroup < MIN_SUBGROUP_SIZE) {
        warnings.push(
          `У підгрупі ≈${perSubgroup} студентів — менше мінімуму ${MIN_SUBGROUP_SIZE} осіб ` +
          `(Наказ МОН №686 п.5). Поділ допустимий лише за наявності педагогічного обґрунтування.`,
        )
      }
    }

    // Для effectiveTeacher потрібен primaryTeacher батьківського subject
    const primaryTeacher = lesson.subjectAssignment.primaryTeacherId !== null
      ? await this.prisma.teacher.findUnique({
          where: { id: lesson.subjectAssignment.primaryTeacherId },
          select: TEACHER_SELECT,
        })
      : null

    return this.mapLessonToDto(updated, primaryTeacher, warnings)
  }

  /**
   * Підтверджує наказом усі DRAFT subject assignments для заданого WC.
   *
   * [HARD BLOCK] Перевищення 720 × rate год/рік для effectiveTeacher будь-якого lesson.
   * [SOFT WARN]  Дата наказу після 01.09 навчального року.
   * [SOFT WARN]  Підтвердження адміністратором (не директором).
   * [SOFT WARN]  Відсутнє погодження профспілки.
   */
  public async confirm(
    dto: ConfirmSubjectAssignmentsDto,
    userId: string,
  ): Promise<ConfirmSubjectAssignmentsResultDto> {
    const { workingCurriculumId, orderNumber, orderDate } = dto

    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id: workingCurriculumId },
      select: { id: true, academicYear: true, tradeUnionApprovedAt: true },
    })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    const draftCount = await this.prisma.teacherLoadSubjectAssignment.count({
      where: { workingCurriculumId, status: 'DRAFT' },
    })
    if (draftCount === 0) {
      throw new BadRequestException(
        'Немає DRAFT-записів для підтвердження. Спочатку згенеруйте розподіл.',
      )
    }

    // C0 [HARD BLOCK]: всі DRAFT-записи повинні мати призначеного основного викладача
    const unassignedCount = await this.prisma.teacherLoadSubjectAssignment.count({
      where: { workingCurriculumId, status: 'DRAFT', primaryTeacherId: null },
    })
    if (unassignedCount > 0) {
      throw new BadRequestException(
        `Неможливо підтвердити наказ: ${unassignedCount} освітніх компонентів не мають призначеного викладача.`,
      )
    }

    // C1 [HARD BLOCK]: перевірка ліміту 720 × rate по effectiveTeacher
    await this.assertTeacherHoursWithinLimit(wc.academicYear)

    const warnings: string[] = []

    // C6 [SOFT WARN]: підтвердження адміністратором
    const confirmingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (confirmingUser?.role === 'ADMINISTRATOR') {
      warnings.push(
        'Наказ підтверджено адміністратором системи. ' +
        'Юридично наказ підписує директор (Ст. 60 Закону №2745-VIII).',
      )
    }

    // R1 [SOFT WARN]: дата наказу після 01.09
    const [yearStart] = wc.academicYear.split('-')
    if (yearStart !== undefined) {
      const sept1 = new Date(`${yearStart}-09-01`)
      if (new Date(orderDate) > sept1) {
        warnings.push(
          `Дата наказу (${new Date(orderDate).toLocaleDateString('uk-UA')}) ` +
          `пізніше 01.09.${yearStart}. ` +
          `Рекомендовано затверджувати навантаження до початку навчального року.`,
        )
      }
    }

    // J1 [SOFT WARN]: погодження профспілки
    if (wc.tradeUnionApprovedAt === null) {
      warnings.push(
        'Не зафіксовано погодження профспілкового комітету. ' +
        'Наказ може бути оскаржений (Ст. 60 п.5 Закону №2745-VIII).',
      )
    }

    // D1 [SOFT WARN]: викладач веде більше NORM_MAX_DISCIPLINES різних дисциплін
    // Наказ МОН №686 — рекомендований норматив, не жорсткий.
    const drafts = await this.prisma.teacherLoadSubjectAssignment.findMany({
      where: { workingCurriculumId, status: 'DRAFT', primaryTeacherId: { not: null } },
      select: {
        primaryTeacherId: true,
        curriculumComponentTerm: {
          select: { component: { select: { id: true, name: true } } },
        },
        primaryTeacher: { select: { lastName: true, firstName: true } },
      },
    })
    const disciplinesByTeacher = new Map<string, Set<string>>()
    for (const sa of drafts) {
      if (sa.primaryTeacherId === null) continue
      if (!disciplinesByTeacher.has(sa.primaryTeacherId)) {
        disciplinesByTeacher.set(sa.primaryTeacherId, new Set())
      }
      disciplinesByTeacher.get(sa.primaryTeacherId)!.add(sa.curriculumComponentTerm.component.id)
    }
    for (const sa of drafts) {
      if (sa.primaryTeacherId === null) continue
      const count = disciplinesByTeacher.get(sa.primaryTeacherId)?.size ?? 0
      if (count > NORM_MAX_DISCIPLINES) {
        const name = sa.primaryTeacher
          ? `${sa.primaryTeacher.lastName} ${sa.primaryTeacher.firstName}`
          : sa.primaryTeacherId
        warnings.push(
          `Викладач ${name} веде ${count} дисциплін (рекомендований максимум — ${NORM_MAX_DISCIPLINES}, Наказ МОН №686).`,
        )
        // Видаляємо щоб не дублювати попередження для одного викладача
        disciplinesByTeacher.delete(sa.primaryTeacherId)
      }
    }

    const result = await this.prisma.teacherLoadSubjectAssignment.updateMany({
      where: { workingCurriculumId, status: 'DRAFT' },
      data: {
        status:            'CONFIRMED',
        orderNumber,
        orderDate:         new Date(orderDate),
        signedByDirectorId: userId,
      },
    })

    this.logger.log(
      `Confirmed ${result.count} subject assignments for WC id=${workingCurriculumId}, order=${orderNumber}`,
    )
    return { confirmed: result.count, warnings }
  }

  /**
   * Скасовує наказ: повертає всі CONFIRMED записи WC у статус DRAFT,
   * очищає номер/дату наказу і підпис директора. Фіксує дію в AuditLog.
   *
   * Юридично значуща операція — лише DIRECTOR/ADMINISTRATOR (гард на контролері).
   */
  public async revoke(
    dto: RevokeSubjectAssignmentsDto,
    userId: string,
    req: Request,
  ): Promise<RevokeSubjectAssignmentsResultDto> {
    const { workingCurriculumId, reason } = dto

    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id: workingCurriculumId },
      select: { id: true },
    })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    const confirmedCount = await this.prisma.teacherLoadSubjectAssignment.count({
      where: { workingCurriculumId, status: 'CONFIRMED' },
    })
    if (confirmedCount === 0) {
      throw new BadRequestException('Немає підтверджених наказом записів для скасування.')
    }

    const reverted = await this.prisma.$transaction(async (tx) => {
      const result = await tx.teacherLoadSubjectAssignment.updateMany({
        where: { workingCurriculumId, status: 'CONFIRMED' },
        data: {
          status: 'DRAFT',
          orderNumber: null,
          orderDate: null,
          signedByDirectorId: null,
        },
      })

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REVOKE_TEACHER_LOAD_ORDER',
          targetId: workingCurriculumId,
          targetType: 'WorkingCurriculum',
          ipAddress: req.ip ?? null,
          metadata: { reverted: result.count, reason: reason ?? null },
        },
      })

      return result.count
    })

    this.logger.log(
      `Revoked teacher-load order for WC id=${workingCurriculumId}: ${reverted} records → DRAFT (userId=${userId})`,
    )
    return { reverted }
  }

  /**
   * Змінює режим розподілу практик/лаб (STREAM ↔ PER_GROUP) для ОК-семестру
   * робочого плану та перегенеровує DRAFT-призначення під новий режим.
   *
   * [HARD BLOCK] якщо для цього ОК у плані вже є CONFIRMED-записи.
   */
  public async setDistributionMode(
    dto: SetDistributionModeDto,
    userId: string,
  ): Promise<SubjectAssignmentDto[]> {
    const { workingCurriculumId, curriculumComponentTermId, practiceMode, labMode } = dto

    const wct = await this.prisma.workingCurriculumComponentTerm.findUnique({
      where: {
        workingCurriculumId_componentTermId: {
          workingCurriculumId,
          componentTermId: curriculumComponentTermId,
        },
      },
      select: { id: true },
    })
    if (!wct) throw new NotFoundException('Компонент робочого плану не знайдено.')

    const confirmed = await this.prisma.teacherLoadSubjectAssignment.count({
      where: { workingCurriculumId, curriculumComponentTermId, status: 'CONFIRMED' },
    })
    if (confirmed > 0) {
      throw new BadRequestException(
        'Навантаження підтверджено наказом — змінити режим розподілу не можна. Спочатку скасуйте наказ.',
      )
    }

    await this.prisma.workingCurriculumComponentTerm.update({
      where: { id: wct.id },
      data: {
        ...(practiceMode !== undefined && { practiceMode }),
        ...(labMode !== undefined && { labMode }),
      },
    })

    // Перегенеровуємо DRAFT, щоб структура subject'ів відповідала новому режиму
    // (призначення викладачів зберігаються там, де ключі збігаються).
    return this.generate(workingCurriculumId, userId)
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * C1 [HARD BLOCK]: перевіряє, що жоден effectiveTeacher не перевищує
   * ліміт 720 × rate год/рік з урахуванням УСІХ WC за навчальний рік.
   *
   * effectiveTeacherId per lesson = overrideTeacherId ?? parent.primaryTeacherId
   */
  private async assertTeacherHoursWithinLimit(academicYear: string): Promise<void> {
    const lessons = await this.prisma.teacherLoadLessonAssignment.findMany({
      where: { subjectAssignment: { academicYear } },
      select: {
        hours: true,
        overrideTeacherId: true,
        subjectAssignment: { select: { primaryTeacherId: true } },
      },
    })

    const hoursByTeacher = new Map<string, number>()
    for (const lesson of lessons) {
      const effectiveId =
        lesson.overrideTeacherId ?? lesson.subjectAssignment.primaryTeacherId
      if (effectiveId === null) continue
      hoursByTeacher.set(effectiveId, (hoursByTeacher.get(effectiveId) ?? 0) + lesson.hours)
    }

    if (hoursByTeacher.size === 0) return

    const teachers = await this.prisma.teacher.findMany({
      where: { id: { in: [...hoursByTeacher.keys()] } },
      select: { id: true, firstName: true, lastName: true, rate: true },
    })
    const byId = new Map(teachers.map((t) => [t.id, t]))

    const exceeded: string[] = []
    for (const [tid, totalHours] of hoursByTeacher) {
      const t = byId.get(tid)
      const rate = t?.rate.toNumber() ?? 1.0
      const limit = teachingHoursLimit(rate)
      if (totalHours > limit) {
        const name = t ? `${t.lastName} ${t.firstName}` : tid
        exceeded.push(
          `${name}: ${totalHours} год` +
          ` (ліміт ${limit} год = ${NORM_TEACHING_HOURS_PER_RATE} × ${rate} ставки)`,
        )
      }
    }

    if (exceeded.length > 0) {
      throw new BadRequestException(
        `Перевищено ліміт навчального навантаження (Ст. 60 №2745-VIII):\n` +
        exceeded.join('\n'),
      )
    }
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

  private mapSubjectToDto(
    row: SubjectRow,
    warnings: string[],
    modes?: { practiceMode: LoadDistributionMode; labMode: LoadDistributionMode },
  ): SubjectAssignmentDto {
    const ct = row.curriculumComponentTerm
    const primaryTeacher = row.primaryTeacher !== null
      ? this.mapTeacherRef(row.primaryTeacher)
      : null

    const lessons = row.lessonAssignments.map((la) =>
      this.mapLessonToDto(la, row.primaryTeacher, []),
    )

    return {
      id:                       row.id,
      workingCurriculumId:      row.workingCurriculumId,
      curriculumComponentTermId: row.curriculumComponentTermId,
      componentId:              ct.component.id,
      componentCode:            ct.component.code,
      componentName:            ct.component.name,
      semesterNumber:           ct.semesterNumber,
      groupId:                  row.groupId,
      groupName:                row.group?.name ?? null,
      academicYear:             row.academicYear,
      primaryTeacher,
      status:                   row.status,
      orderNumber:              row.orderNumber,
      orderDate:                row.orderDate?.toISOString() ?? null,
      assignedById:             row.assignedById,
      signedByDirectorId:       row.signedByDirectorId,
      practiceMode:             modes?.practiceMode ?? 'STREAM',
      labMode:                  modes?.labMode ?? 'STREAM',
      totalHours:               lessons.reduce((s, l) => s + l.hours, 0),
      lessons,
      warnings,
      createdAt:                row.createdAt.toISOString(),
      updatedAt:                row.updatedAt.toISOString(),
    }
  }

  private mapLessonToDto(
    la: { id: string; lessonType: LessonType; subgroupNumber: number | null; hours: number; overrideTeacher: TeacherSelectResult | null; createdAt: Date; updatedAt: Date },
    primaryTeacher: TeacherSelectResult | null,
    warnings: string[],
  ): LessonAssignmentDto {
    const overrideTeacher = la.overrideTeacher !== null
      ? this.mapTeacherRef(la.overrideTeacher)
      : null

    const effectiveRaw = la.overrideTeacher ?? primaryTeacher
    const effectiveTeacher = effectiveRaw !== null
      ? this.mapTeacherRef(effectiveRaw)
      : null

    return {
      id:               la.id,
      lessonType:       la.lessonType,
      subgroupNumber:   la.subgroupNumber,
      hours:            la.hours,
      overrideTeacher,
      effectiveTeacher,
      createdAt:        la.createdAt.toISOString(),
      updatedAt:        la.updatedAt.toISOString(),
      // warnings attached at call site
      ...(warnings.length > 0 && { warnings }),
    } as LessonAssignmentDto
  }

  private mapTeacherRef(t: TeacherSelectResult): TeacherRefDto {
    return {
      id:             t.id,
      lastName:       t.lastName,
      firstName:      t.firstName,
      middleName:     t.middleName,
      fullName:       `${t.lastName} ${t.firstName}${t.middleName ? ` ${t.middleName}` : ''}`,
      positionName:   t.positionName,
      departmentName: t.universityFacultyChairShortName ?? t.universityFacultyChairFullName ?? null,
      rate:           t.rate.toNumber(),
    }
  }
}
