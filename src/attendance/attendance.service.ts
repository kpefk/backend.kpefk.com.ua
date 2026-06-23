import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { AttendanceStatus, UserRole, type Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { BELL_TIMES, HOMEROOM_BELL } from '@/schedule/schedule.constants'
import { activeStudentWhere } from '@/libs/common/active-student'

import {
  TEACHER_BACKFILL_DAYS,
  isElevated,
} from './attendance.constants'
import {
  academicYearOf,
  parseDateOnly,
  termOf,
} from './attendance.calendar'
import { AttendanceScheduleService, type ResolvedLesson } from './attendance-schedule.service'
import type {
  AttendanceRowDto,
  LessonSessionDto,
  LessonSlotDto,
  ListLessonsQueryDto,
  OpenSessionDto,
  SaveRecordsDto,
  UpdateSessionDto,
} from './dto/attendance.dto'

/** Хто виконує дію (з гарду авторизації). */
export interface Actor {
  userId: string
  role: UserRole
}

interface RosterStudent {
  studentId: string
  fullName: string
  userId: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class AttendanceService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleResolver: AttendanceScheduleService,
  ) {}

  // ── Lessons of the day ──────────────────────────────────────────────────────

  public async listLessons(
    query: ListLessonsQueryDto,
    actor: Actor,
  ): Promise<LessonSlotDto[]> {
    const date = parseDateOnly(query.date)
    this.assertReadable(date)

    const lessons = await this.resolveLessons(query, actor, date)
    if (lessons.length === 0) return []

    // Наявні сторінки журналу для цих занять на дату.
    const sessions = await this.prisma.lessonSession.findMany({
      where: {
        date,
        deletedAt: null,
        groupId: { in: [...new Set(lessons.map((l) => l.groupId))] },
      },
      select: {
        id: true,
        groupId: true,
        slotNumber: true,
        subgroupNumber: true,
        topic: true,
      },
    })
    const sessionByKey = new Map(
      sessions.map((s) => [this.sessionKey(s.groupId, s.slotNumber, s.subgroupNumber), s]),
    )

    return lessons.map((l): LessonSlotDto => {
      const time = this.slotTime(l.slotNumber)
      const session = sessionByKey.get(
        this.sessionKey(l.groupId, l.slotNumber, l.subgroupNumber ?? 0),
      )
      return {
        scheduleEntryId: l.scheduleEntryId,
        groupId: l.groupId,
        groupName: l.groupName,
        curriculumComponentTermId: l.curriculumComponentTermId,
        componentCode: l.componentCode,
        subjectName: l.subjectName,
        slotNumber: l.slotNumber,
        startTime: time.start,
        endTime: time.end,
        subgroupNumber: l.subgroupNumber,
        classroomNumber: l.classroom?.number ?? null,
        isSubstituteTeacher: l.isSubstituteTeacher,
        hasSession: !!session,
        sessionId: session?.id ?? null,
        topic: session?.topic ?? null,
      }
    })
  }

  // ── Open (get-or-create) a journal page ────────────────────────────────────

  public async openSession(dto: OpenSessionDto, actor: Actor): Promise<LessonSessionDto> {
    const date = parseDateOnly(dto.date)
    this.assertWritable(date, actor.role)

    const entry = await this.prisma.scheduleEntry.findUnique({
      where: { id: dto.scheduleEntryId },
      select: { lessonType: true, schedule: { select: { groupId: true } } },
    })
    if (!entry) throw new NotFoundException('Заняття розкладу не знайдено.')

    // Підтверджуємо, що заняття справді відбувається в цей день (парність/заміни).
    const dayLessons = await this.scheduleResolver.resolveForGroup(
      entry.schedule.groupId,
      date,
    )
    const lesson = dayLessons.find((l) => l.scheduleEntryId === dto.scheduleEntryId)
    if (!lesson) {
      throw new BadRequestException(
        'Це заняття не відбувається в обрану дату (інша парність тижня або скасовано).',
      )
    }

    await this.assertCanEditLesson(lesson.teacherId, actor)

    const subgroupNumber = lesson.subgroupNumber ?? 0
    const existing = await this.prisma.lessonSession.findUnique({
      where: {
        groupId_date_slotNumber_subgroupNumber: {
          groupId: lesson.groupId,
          date,
          slotNumber: lesson.slotNumber,
          subgroupNumber,
        },
      },
      select: { id: true, deletedAt: true },
    })

    let sessionId: string
    if (existing) {
      sessionId = existing.id
      if (existing.deletedAt) {
        await this.prisma.lessonSession.update({
          where: { id: sessionId },
          data: { deletedAt: null },
        })
      }
    } else {
      const created = await this.prisma.lessonSession.create({
        data: {
          date,
          academicYear: lesson.academicYear,
          semesterNumber: lesson.semesterNumber,
          groupId: lesson.groupId,
          curriculumComponentTermId: lesson.curriculumComponentTermId,
          subjectName: lesson.subjectName,
          teacherId: lesson.teacherId,
          slotNumber: lesson.slotNumber,
          weekParity: lesson.weekParity,
          lessonType: dto.lessonType ?? entry.lessonType,
          subgroupNumber,
          topic: dto.topic ?? null,
          scheduleEntryId: lesson.scheduleEntryId,
          recordedById: actor.userId,
        },
        select: { id: true },
      })
      sessionId = created.id
    }

    return this.loadAndMap(sessionId, actor)
  }

  // ── Read / update a session ─────────────────────────────────────────────────

  public getSession(id: string, actor: Actor): Promise<LessonSessionDto> {
    return this.loadAndMap(id, actor)
  }

  public async updateSession(
    id: string,
    dto: UpdateSessionDto,
    actor: Actor,
  ): Promise<LessonSessionDto> {
    const session = await this.loadSessionOrThrow(id)
    await this.assertCanEditLesson(session.teacherId, actor)
    this.assertWritable(session.date, actor.role)

    await this.prisma.lessonSession.update({
      where: { id },
      data: { topic: dto.topic, lessonType: dto.lessonType },
    })
    await this.auditIfElevated(actor, 'ATTENDANCE_SESSION_UPDATE', id)
    return this.loadAndMap(id, actor)
  }

  // ── Save attendance + grades ────────────────────────────────────────────────

  public async saveRecords(
    id: string,
    dto: SaveRecordsDto,
    actor: Actor,
  ): Promise<LessonSessionDto> {
    const session = await this.loadSessionOrThrow(id)
    await this.assertCanEditLesson(session.teacherId, actor)
    this.assertWritable(session.date, actor.role)

    const roster = await this.buildRoster(
      session.groupId,
      session.curriculumComponentTermId,
      session.subgroupNumber,
    )
    const nameById = new Map(roster.map((r) => [r.studentId, r.fullName]))

    for (const r of dto.records) {
      if (!nameById.has(r.studentId)) {
        throw new BadRequestException(
          'Один зі студентів не належить до цього заняття.',
        )
      }
    }

    await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            lessonSessionId_studentId: { lessonSessionId: id, studentId: r.studentId },
          },
          create: {
            lessonSessionId: id,
            studentId: r.studentId,
            studentName: nameById.get(r.studentId) as string,
            status: r.status,
            grade: r.grade ?? null,
            comment: r.comment ?? null,
          },
          update: {
            status: r.status,
            grade: r.grade ?? null,
            comment: r.comment ?? null,
          },
        }),
      ),
    )

    await this.auditIfElevated(actor, 'ATTENDANCE_RECORDS_SAVE', id, {
      records: dto.records.length,
    })
    return this.loadAndMap(id, actor)
  }

  // ── Carry over attendance from earlier lesson of same group today ───────────

  public async carryOver(id: string, actor: Actor): Promise<LessonSessionDto> {
    const session = await this.loadSessionOrThrow(id)
    await this.assertCanEditLesson(session.teacherId, actor)
    this.assertWritable(session.date, actor.role)

    const prev = await this.prisma.lessonSession.findFirst({
      where: {
        groupId: session.groupId,
        date: session.date,
        slotNumber: { lt: session.slotNumber },
        deletedAt: null,
      },
      orderBy: { slotNumber: 'desc' },
      select: { records: { select: { studentId: true, status: true } } },
    })
    if (!prev) {
      throw new BadRequestException(
        'Немає попереднього заняття цієї групи сьогодні для перенесення.',
      )
    }
    const prevStatus = new Map(prev.records.map((r) => [r.studentId, r.status]))

    const roster = await this.buildRoster(
      session.groupId,
      session.curriculumComponentTermId,
      session.subgroupNumber,
    )

    await this.prisma.$transaction(
      roster
        .filter((s) => prevStatus.has(s.studentId))
        .map((s) =>
          this.prisma.attendanceRecord.upsert({
            where: {
              lessonSessionId_studentId: { lessonSessionId: id, studentId: s.studentId },
            },
            create: {
              lessonSessionId: id,
              studentId: s.studentId,
              studentName: s.fullName,
              status: prevStatus.get(s.studentId) as AttendanceStatus,
            },
            update: { status: prevStatus.get(s.studentId) as AttendanceStatus },
          }),
        ),
    )

    return this.loadAndMap(id, actor)
  }

  // ── Internal: resolution ────────────────────────────────────────────────────

  private async resolveLessons(
    query: ListLessonsQueryDto,
    actor: Actor,
    date: Date,
  ): Promise<ResolvedLesson[]> {
    if (actor.role === UserRole.TEACHER) {
      const teacherId = await this.resolveTeacherId(actor.userId)
      return teacherId ? this.scheduleResolver.resolveForTeacher(teacherId, date) : []
    }
    // Керівництво.
    if (query.groupId) return this.scheduleResolver.resolveForGroup(query.groupId, date)
    if (query.teacherId) return this.scheduleResolver.resolveForTeacher(query.teacherId, date)

    const ownTeacherId = await this.resolveTeacherId(actor.userId)
    if (ownTeacherId) return this.scheduleResolver.resolveForTeacher(ownTeacherId, date)
    throw new BadRequestException('Вкажіть teacherId або groupId.')
  }

  // ── Internal: load + map ────────────────────────────────────────────────────

  private async loadSessionOrThrow(id: string) {
    const session = await this.prisma.lessonSession.findUnique({ where: { id } })
    if (!session || session.deletedAt) throw new NotFoundException('Сторінку журналу не знайдено.')
    return session
  }

  private async loadAndMap(id: string, actor: Actor): Promise<LessonSessionDto> {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id },
      include: {
        group: { select: { name: true } },
        curriculumComponentTerm: { select: { component: { select: { code: true } } } },
        records: true,
      },
    })
    if (!session || session.deletedAt) throw new NotFoundException('Сторінку журналу не знайдено.')

    this.assertReadable(session.date)
    await this.assertCanViewLesson(session.teacherId, actor)

    const roster = await this.buildRoster(
      session.groupId,
      session.curriculumComponentTermId,
      session.subgroupNumber,
    )
    const recByStudent = new Map(session.records.map((r) => [r.studentId, r]))

    const rows: AttendanceRowDto[] = roster.map((s) => {
      const r = recByStudent.get(s.studentId)
      return {
        studentId: s.studentId,
        fullName: s.fullName,
        userId: s.userId,
        status: r?.status ?? AttendanceStatus.ABSENT,
        grade: r?.grade ?? null,
        comment: r?.comment ?? null,
      }
    })

    const time = this.slotTime(session.slotNumber)
    const canEdit = await this.canEditLesson(session.teacherId, actor) && this.isWritable(session.date, actor.role)

    return {
      id: session.id,
      date: this.toDateString(session.date),
      academicYear: session.academicYear,
      semesterNumber: session.semesterNumber,
      groupId: session.groupId,
      groupName: session.group.name,
      curriculumComponentTermId: session.curriculumComponentTermId,
      subjectName: session.subjectName,
      componentCode: session.curriculumComponentTerm.component.code,
      slotNumber: session.slotNumber,
      startTime: time.start,
      endTime: time.end,
      subgroupNumber: session.subgroupNumber,
      lessonType: session.lessonType,
      topic: session.topic,
      teacherId: session.teacherId,
      canEdit,
      rows,
    }
  }

  // ── Internal: roster ────────────────────────────────────────────────────────

  private async buildRoster(
    groupId: string,
    componentTermId: string,
    subgroupNumber: number,
  ): Promise<RosterStudent[]> {
    const students = await this.prisma.student.findMany({
      where: { groupId, ...activeStudentWhere() },
      select: { id: true, personFIO: true, userId: true },
      orderBy: { personFIO: 'asc' },
    })

    if (subgroupNumber <= 0) {
      return students.map((s) => ({
        studentId: s.id,
        fullName: s.personFIO,
        userId: s.userId,
      }))
    }

    const members = await this.prisma.studentSubgroup.findMany({
      where: { curriculumComponentTermId: componentTermId, groupId, subgroupNumber },
      select: { studentId: true },
    })
    const memberIds = new Set(members.map((m) => m.studentId))
    return students
      .filter((s) => memberIds.has(s.id))
      .map((s) => ({ studentId: s.id, fullName: s.personFIO, userId: s.userId }))
  }

  // ── Internal: access + date windows ─────────────────────────────────────────

  private resolveTeacherId(userId: string): Promise<string | null> {
    return this.prisma.teacher
      .findUnique({ where: { userId }, select: { id: true } })
      .then((t) => t?.id ?? null)
  }

  private async canEditLesson(lessonTeacherId: string, actor: Actor): Promise<boolean> {
    if (isElevated(actor.role)) return true
    const teacherId = await this.resolveTeacherId(actor.userId)
    return teacherId === lessonTeacherId
  }

  private async assertCanEditLesson(lessonTeacherId: string, actor: Actor): Promise<void> {
    if (!(await this.canEditLesson(lessonTeacherId, actor))) {
      throw new ForbiddenException('Ви не ведете це заняття.')
    }
  }

  /** Перегляд: викладач заняття або керівництво. */
  private async assertCanViewLesson(lessonTeacherId: string, actor: Actor): Promise<void> {
    await this.assertCanEditLesson(lessonTeacherId, actor)
  }

  private assertReadable(date: Date): void {
    const today = this.todayUtc()
    if (date.getTime() > today.getTime()) {
      throw new ForbiddenException('Майбутні дати недоступні.')
    }
    if (!this.sameSemester(date, today)) {
      throw new ForbiddenException('Дата поза межами поточного семестру.')
    }
  }

  private assertWritable(date: Date, role: UserRole): void {
    this.assertReadable(date)
    if (isElevated(role)) return
    const today = this.todayUtc()
    const days = Math.floor((today.getTime() - date.getTime()) / DAY_MS)
    if (days > TEACHER_BACKFILL_DAYS) {
      throw new ForbiddenException(
        `Викладач може заповнювати журнал не далі ${TEACHER_BACKFILL_DAYS} днів у минуле.`,
      )
    }
  }

  private isWritable(date: Date, role: UserRole): boolean {
    try {
      this.assertWritable(date, role)
      return true
    } catch {
      return false
    }
  }

  private sameSemester(a: Date, b: Date): boolean {
    return academicYearOf(a) === academicYearOf(b) && termOf(a) === termOf(b)
  }

  private todayUtc(): Date {
    const n = new Date()
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
  }

  // ── Internal: misc ──────────────────────────────────────────────────────────

  private async auditIfElevated(
    actor: Actor,
    action: string,
    sessionId: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    if (!isElevated(actor.role)) return
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: actor.userId,
          action,
          targetId: sessionId,
          targetType: 'LessonSession',
          metadata,
        },
      })
    } catch {
      // аудит не повинен валити основну дію
    }
  }

  private slotTime(slot: number): { start: string; end: string } {
    const bell =
      BELL_TIMES.find((b) => b.slot === slot) ??
      (slot === HOMEROOM_BELL.slot ? HOMEROOM_BELL : null)
    return bell ? { start: bell.start, end: bell.end } : { start: '', end: '' }
  }

  private sessionKey(groupId: string, slot: number, subgroup: number): string {
    return `${groupId}:${slot}:${subgroup}`
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10)
  }
}
