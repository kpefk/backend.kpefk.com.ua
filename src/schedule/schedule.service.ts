import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import type {
  AvailableSubjectDto,
  CopyScheduleDto,
  CreateScheduleEntryDto,
  CrossScheduleEntryDto,
  EligibleGroupDto,
  MassReplaceDto,
  ScheduleDto,
  ScheduleResponseDto,
  SetHomeroomDto,
  SwapScheduleEntriesDto,
  UpdateScheduleEntryDto,
} from './dto/schedule.dto'
import {
  ENTRY_INCLUDE,
  type EntryRow,
  mapEntry,
  resolveTeacher,
  SUBJECT_TEACHER_INCLUDE,
  teacherMiniRef,
} from './schedule.helpers'
import { ScheduleSettingsService } from './schedule-settings.service'

/** Види занять, що можуть потрапити в розклад, та поле годин у робочому терміні. */
const SCHEDULABLE_TYPES = [
  { lessonType: 'LECTURE', field: 'lectureHours' },
  { lessonType: 'PRACTICE', field: 'practicalHours' },
  { lessonType: 'LAB', field: 'labHours' },
  { lessonType: 'SEMINAR', field: 'seminarHours' },
  { lessonType: 'CONSULTATION', field: 'consultationHours' },
] as const

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name)

  public constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: ScheduleSettingsService,
  ) {}

  /** Ліміт пар на день для форми навчання групи цього РНП (ТЗ §3.4). */
  private async resolveMaxPairsPerDay(
    workingCurriculumId: string,
  ): Promise<number | null> {
    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id: workingCurriculumId },
      select: {
        version: { select: { curriculum: { select: { educationForm: true } } } },
      },
    })
    return this.settingsService.maxPairsForForm(
      wc?.version.curriculum.educationForm ?? null,
    )
  }

  // ── Resolution ───────────────────────────────────────────────────────────

  /**
   * РНП групи на навчальний рік.
   *
   * Спочатку перевіряє явну операційну прив'язку (GroupWorkingCurriculumAssignment).
   * Якщо її немає — резолвить через нормативну прив'язку версії плану
   * (GroupCurriculumAssignment.isActive → versionId) і WorkingCurriculum цього року,
   * як це робить модуль педагогічного навантаження.
   */
  public async resolveWorkingCurriculumId(
    groupId: string,
    academicYear: string,
  ): Promise<string | null> {
    const explicit = await this.prisma.groupWorkingCurriculumAssignment.findUnique({
      where: { groupId_academicYear: { groupId, academicYear } },
      select: { workingCurriculumId: true },
    })
    if (explicit) return explicit.workingCurriculumId

    const assignment = await this.prisma.groupCurriculumAssignment.findFirst({
      where: { groupId, isActive: true },
      select: { versionId: true },
    })
    if (!assignment) return null

    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { versionId_academicYear: { versionId: assignment.versionId, academicYear } },
      select: { id: true },
    })
    return wc?.id ?? null
  }

  /** Усі записи розкладів цього (рік + семестр) по всіх групах — для конфліктів. */
  private async loadPeriodEntries(
    academicYear: string,
    semesterNumber: number,
  ): Promise<EntryRow[]> {
    return this.prisma.scheduleEntry.findMany({
      where: { schedule: { academicYear, semesterNumber } },
      include: ENTRY_INCLUDE,
    })
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  public async getSchedule(
    groupId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<ScheduleResponseDto> {
    const workingCurriculumId = await this.resolveWorkingCurriculumId(
      groupId,
      academicYear,
    )
    if (!workingCurriculumId) {
      return {
        hasWorkingCurriculum: false,
        workingCurriculumId: null,
        schedule: null,
        warnings: [
          'Для цієї групи не заповнено робочий навчальний план на обраний рік. ' +
            'Спочатку прив’яжіть РНП, потім згенеруйте розклад.',
        ],
      }
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: {
        groupId_academicYear_semesterNumber: {
          groupId,
          academicYear,
          semesterNumber,
        },
      },
      include: {
        group: { include: { _count: { select: { students: true } } } },
        entries: { include: ENTRY_INCLUDE },
      },
    })

    if (!schedule) {
      return {
        hasWorkingCurriculum: true,
        workingCurriculumId,
        schedule: null,
        warnings: [],
      }
    }

    const periodEntries = await this.loadPeriodEntries(academicYear, semesterNumber)
    const groupSize = schedule.group._count.students
    const maxPairsPerDay = await this.resolveMaxPairsPerDay(
      schedule.workingCurriculumId,
    )

    return {
      hasWorkingCurriculum: true,
      workingCurriculumId,
      schedule: {
        id: schedule.id,
        groupId: schedule.groupId,
        groupName: schedule.group.name,
        workingCurriculumId: schedule.workingCurriculumId,
        academicYear: schedule.academicYear,
        semesterNumber: schedule.semesterNumber,
        status: schedule.status,
        generatedAt: schedule.generatedAt?.toISOString() ?? null,
        homeroomDayOfWeek: schedule.homeroomDayOfWeek,
        entries: schedule.entries.map((e) =>
          mapEntry(e, schedule.id, periodEntries, {
          groupSize,
          maxPairsPerDay: maxPairsPerDay ?? undefined,
        }),
        ),
      },
      warnings: [],
    }
  }

  /** Серіалізує Schedule у DTO, перерахувавши конфлікти по періоду. */
  public async toScheduleDto(scheduleId: string): Promise<ScheduleDto> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        group: { include: { _count: { select: { students: true } } } },
        entries: { include: ENTRY_INCLUDE },
      },
    })
    if (!schedule) throw new NotFoundException('Розклад не знайдено.')

    const periodEntries = await this.loadPeriodEntries(
      schedule.academicYear,
      schedule.semesterNumber,
    )
    const groupSize = schedule.group._count.students
    const maxPairsPerDay = await this.resolveMaxPairsPerDay(
      schedule.workingCurriculumId,
    )

    return {
      id: schedule.id,
      groupId: schedule.groupId,
      groupName: schedule.group.name,
      workingCurriculumId: schedule.workingCurriculumId,
      academicYear: schedule.academicYear,
      semesterNumber: schedule.semesterNumber,
      status: schedule.status,
      generatedAt: schedule.generatedAt?.toISOString() ?? null,
      homeroomDayOfWeek: schedule.homeroomDayOfWeek,
      entries: schedule.entries.map((e) =>
        mapEntry(e, schedule.id, periodEntries, {
          groupSize,
          maxPairsPerDay: maxPairsPerDay ?? undefined,
        }),
      ),
    }
  }

  // ── All groups (зведений перегляд) ─────────────────────────────────────────

  /**
   * Розклади всіх груп за навчальний рік (для зведеного перегляду «Усі групи»).
   * Конфлікти не обчислюються (це перегляд) — entries.conflicts завжди порожні.
   */
  public async getAllSchedules(academicYear: string): Promise<ScheduleDto[]> {
    const schedules = await this.prisma.schedule.findMany({
      where: { academicYear },
      include: { group: true, entries: { include: ENTRY_INCLUDE } },
      orderBy: { group: { name: 'asc' } },
    })

    return schedules.map((s) => ({
      id: s.id,
      groupId: s.groupId,
      groupName: s.group.name,
      workingCurriculumId: s.workingCurriculumId,
      academicYear: s.academicYear,
      semesterNumber: s.semesterNumber,
      status: s.status,
      generatedAt: s.generatedAt?.toISOString() ?? null,
      homeroomDayOfWeek: s.homeroomDayOfWeek,
      entries: s.entries.map((e) => mapEntry(e, s.id, [])),
    }))
  }

  // ── Eligible groups (для селектора) ────────────────────────────────────────

  public async getEligibleGroups(
    academicYear: string,
  ): Promise<EligibleGroupDto[]> {
    // Групи, що мають активну нормативну прив'язку до версії плану.
    const assignments = await this.prisma.groupCurriculumAssignment.findMany({
      where: { isActive: true },
      select: { groupId: true, versionId: true, group: { select: { name: true } } },
    })

    // Робочі плани цього навчального року: versionId → { wcId, semesterNumbers }.
    const workingCurricula = await this.prisma.workingCurriculum.findMany({
      where: { academicYear },
      select: { id: true, versionId: true, semesterNumbers: true },
    })
    const wcByVersion = new Map(
      workingCurricula.map((w) => [w.versionId, w]),
    )

    // Унікалізуємо по групі (одна активна версія на групу).
    const seen = new Set<string>()
    const result: EligibleGroupDto[] = []
    for (const a of assignments) {
      if (seen.has(a.groupId)) continue
      seen.add(a.groupId)
      const wc = wcByVersion.get(a.versionId) ?? null
      result.push({
        groupId: a.groupId,
        groupName: a.group.name,
        hasWorkingCurriculum: !!wc,
        workingCurriculumId: wc?.id ?? null,
        semesterNumbers: wc?.semesterNumbers ?? [],
      })
    }

    return result.sort((x, y) => x.groupName.localeCompare(y.groupName, 'uk'))
  }

  // ── Available subjects (для діалогу ручного додавання) ──────────────────────

  public async getAvailableSubjects(
    groupId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<AvailableSubjectDto[]> {
    const workingCurriculumId = await this.resolveWorkingCurriculumId(
      groupId,
      academicYear,
    )
    if (!workingCurriculumId) return []

    const workingTerms = await this.prisma.workingCurriculumComponentTerm.findMany({
      where: {
        workingCurriculumId,
        componentTerm: { semesterNumber },
      },
      include: {
        componentTerm: {
          include: {
            component: { select: { code: true, name: true, orderIndex: true } },
          },
        },
      },
    })

    const subjects = await this.prisma.teacherLoadSubjectAssignment.findMany({
      where: { workingCurriculumId },
      include: SUBJECT_TEACHER_INCLUDE,
    })

    return workingTerms
      .map((wt): AvailableSubjectDto => {
        const lessonOptions = SCHEDULABLE_TYPES.filter(
          ({ field }) => (wt[field] ?? 0) > 0,
        ).map(({ lessonType }) => ({
          lessonType,
          defaultTeacher: teacherMiniRef(
            resolveTeacher(
              subjects,
              wt.componentTermId,
              groupId,
              lessonType,
              wt.subgroupCount >= 2 ? 1 : null,
            ),
          ),
        }))
        return {
          curriculumComponentTermId: wt.componentTermId,
          componentCode: wt.componentTerm.component.code,
          componentName: wt.componentTerm.component.name,
          semesterNumber: wt.componentTerm.semesterNumber,
          subgroupCount: wt.subgroupCount,
          lessonOptions,
        }
      })
      .filter((s) => s.lessonOptions.length > 0)
  }

  // ── Manual CRUD ────────────────────────────────────────────────────────────

  /** Find-or-create порожній Schedule для (група × рік × семестр). */
  private async ensureSchedule(
    groupId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<string> {
    const existing = await this.prisma.schedule.findUnique({
      where: {
        groupId_academicYear_semesterNumber: {
          groupId,
          academicYear,
          semesterNumber,
        },
      },
      select: { id: true },
    })
    if (existing) return existing.id

    const workingCurriculumId = await this.resolveWorkingCurriculumId(
      groupId,
      academicYear,
    )
    if (!workingCurriculumId) {
      throw new NotFoundException(
        'Для цієї групи немає робочого навчального плану на обраний рік.',
      )
    }

    const created = await this.prisma.schedule.create({
      data: { groupId, workingCurriculumId, academicYear, semesterNumber },
      select: { id: true },
    })
    return created.id
  }

  public async createEntry(dto: CreateScheduleEntryDto): Promise<ScheduleDto> {
    const scheduleId = await this.ensureSchedule(
      dto.groupId,
      dto.academicYear,
      dto.semesterNumber,
    )

    await this.prisma.scheduleEntry.create({
      data: {
        scheduleId,
        dayOfWeek: dto.dayOfWeek,
        slotNumber: dto.slotNumber,
        weekParity: dto.weekParity,
        lessonType: dto.lessonType,
        subgroupNumber: dto.subgroupNumber ?? null,
        curriculumComponentTermId: dto.curriculumComponentTermId,
        teacherId: dto.teacherId ?? null,
        classroomId: dto.classroomId ?? null,
        onlineUrl: dto.onlineUrl ?? null,
      },
    })

    return this.toScheduleDto(scheduleId)
  }

  public async updateEntry(
    id: string,
    dto: UpdateScheduleEntryDto,
  ): Promise<ScheduleDto> {
    const entry = await this.prisma.scheduleEntry.findUnique({
      where: { id },
      select: { scheduleId: true },
    })
    if (!entry) throw new NotFoundException('Заняття не знайдено.')

    await this.prisma.scheduleEntry.update({
      where: { id },
      data: {
        dayOfWeek: dto.dayOfWeek,
        slotNumber: dto.slotNumber,
        weekParity: dto.weekParity,
        lessonType: dto.lessonType,
        subgroupNumber: dto.subgroupNumber,
        teacherId: dto.teacherId,
        classroomId: dto.classroomId,
        onlineUrl: dto.onlineUrl,
      },
    })

    return this.toScheduleDto(entry.scheduleId)
  }

  public async swapEntries(dto: SwapScheduleEntriesDto): Promise<ScheduleDto> {
    const [a, b] = await Promise.all([
      this.prisma.scheduleEntry.findUnique({
        where: { id: dto.entryAId },
        select: { id: true, scheduleId: true, dayOfWeek: true, slotNumber: true, weekParity: true },
      }),
      this.prisma.scheduleEntry.findUnique({
        where: { id: dto.entryBId },
        select: { id: true, scheduleId: true, dayOfWeek: true, slotNumber: true, weekParity: true },
      }),
    ])
    if (!a || !b) throw new NotFoundException('Одне із занять не знайдено.')

    await this.prisma.$transaction([
      this.prisma.scheduleEntry.update({
        where: { id: a.id },
        data: { dayOfWeek: b.dayOfWeek, slotNumber: b.slotNumber, weekParity: b.weekParity },
      }),
      this.prisma.scheduleEntry.update({
        where: { id: b.id },
        data: { dayOfWeek: a.dayOfWeek, slotNumber: a.slotNumber, weekParity: a.weekParity },
      }),
    ])

    return this.toScheduleDto(a.scheduleId)
  }

  public async deleteEntry(id: string): Promise<ScheduleDto> {
    const entry = await this.prisma.scheduleEntry.findUnique({
      where: { id },
      select: { scheduleId: true },
    })
    if (!entry) throw new NotFoundException('Заняття не знайдено.')

    await this.prisma.scheduleEntry.delete({ where: { id } })
    return this.toScheduleDto(entry.scheduleId)
  }

  // ── Homeroom (ТЗ §3.5) ──────────────────────────────────────────────────────

  /** Призначає/прибирає день виховної години для групи (dayOfWeek=null прибирає). */
  public async setHomeroom(dto: SetHomeroomDto): Promise<ScheduleDto> {
    const scheduleId = await this.ensureSchedule(
      dto.groupId,
      dto.academicYear,
      dto.semesterNumber,
    )
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { homeroomDayOfWeek: dto.dayOfWeek },
    })
    return this.toScheduleDto(scheduleId)
  }

  // ── Copy schedule as template (ТЗ §3.8) ─────────────────────────────────────

  /** Копіює заняття з одного розкладу-джерела у цільову (група × рік × семестр). */
  public async copySchedule(dto: CopyScheduleDto): Promise<ScheduleDto> {
    const source = await this.prisma.schedule.findUnique({
      where: { id: dto.fromScheduleId },
      include: { entries: true },
    })
    if (!source) throw new NotFoundException('Розклад-джерело не знайдено.')

    const targetId = await this.ensureSchedule(
      dto.toGroupId,
      dto.toAcademicYear,
      dto.toSemesterNumber,
    )

    const existing = await this.prisma.scheduleEntry.count({
      where: { scheduleId: targetId },
    })
    if (existing > 0) {
      if (!dto.overwrite) {
        throw new BadRequestException(
          'Цільовий розклад не порожній. Увімкніть overwrite, щоб перезаписати.',
        )
      }
      await this.prisma.scheduleEntry.deleteMany({ where: { scheduleId: targetId } })
    }

    if (source.entries.length > 0) {
      await this.prisma.scheduleEntry.createMany({
        data: source.entries.map((e) => ({
          scheduleId: targetId,
          dayOfWeek: e.dayOfWeek,
          slotNumber: e.slotNumber,
          weekParity: e.weekParity,
          lessonType: e.lessonType,
          subgroupNumber: e.subgroupNumber,
          curriculumComponentTermId: e.curriculumComponentTermId,
          teacherId: e.teacherId,
          classroomId: e.classroomId,
          onlineUrl: e.onlineUrl,
        })),
      })
    }
    if (source.homeroomDayOfWeek !== null) {
      await this.prisma.schedule.update({
        where: { id: targetId },
        data: { homeroomDayOfWeek: source.homeroomDayOfWeek },
      })
    }

    return this.toScheduleDto(targetId)
  }

  // ── Mass replace teacher/classroom (ТЗ §3.8) ────────────────────────────────

  /** Масово замінює викладача/аудиторію для набору занять одного розкладу. */
  public async massReplace(dto: MassReplaceDto): Promise<ScheduleDto> {
    if (dto.entryIds.length === 0) {
      throw new BadRequestException('Не передано жодного заняття.')
    }
    const entries = await this.prisma.scheduleEntry.findMany({
      where: { id: { in: dto.entryIds } },
      select: { id: true, scheduleId: true },
    })
    if (entries.length !== dto.entryIds.length) {
      throw new NotFoundException('Деякі заняття не знайдено.')
    }
    const scheduleIds = new Set(entries.map((e) => e.scheduleId))
    if (scheduleIds.size !== 1) {
      throw new BadRequestException(
        'Масова заміна підтримується лише в межах одного розкладу.',
      )
    }

    const data: { teacherId?: string | null; classroomId?: string | null } = {}
    if (dto.teacherId !== undefined) data.teacherId = dto.teacherId
    if (dto.classroomId !== undefined) data.classroomId = dto.classroomId
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нічого замінювати: не задано викладача чи аудиторію.')
    }

    await this.prisma.scheduleEntry.updateMany({
      where: { id: { in: dto.entryIds } },
      data,
    })

    return this.toScheduleDto([...scheduleIds][0])
  }

  // ── Teacher / classroom views (ТЗ §3.10) ────────────────────────────────────

  private async crossView(
    where: { teacherId: string } | { classroomId: string },
    academicYear: string,
    semesterNumber: number,
  ): Promise<CrossScheduleEntryDto[]> {
    const periodEntries = await this.loadPeriodEntries(academicYear, semesterNumber)

    const rows = await this.prisma.scheduleEntry.findMany({
      where: { ...where, schedule: { academicYear, semesterNumber } },
      include: {
        ...ENTRY_INCLUDE,
        schedule: { select: { id: true, groupId: true, group: { select: { name: true } } } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { slotNumber: 'asc' }],
    })

    return rows.map((r) => ({
      ...mapEntry(r, r.schedule.id, periodEntries),
      groupId: r.schedule.groupId,
      groupName: r.schedule.group.name,
    }))
  }

  public getByTeacher(
    teacherId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<CrossScheduleEntryDto[]> {
    return this.crossView({ teacherId }, academicYear, semesterNumber)
  }

  public getByClassroom(
    classroomId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<CrossScheduleEntryDto[]> {
    return this.crossView({ classroomId }, academicYear, semesterNumber)
  }

  // ── Publish / unpublish ────────────────────────────────────────────────────

  public async setStatus(
    scheduleId: string,
    publish: boolean,
  ): Promise<ScheduleDto> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { id: true },
    })
    if (!schedule) throw new NotFoundException('Розклад не знайдено.')

    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: publish ? 'PUBLISHED' : 'DRAFT' },
    })
    return this.toScheduleDto(scheduleId)
  }
}
