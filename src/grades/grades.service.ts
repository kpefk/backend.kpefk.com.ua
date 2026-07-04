import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  type GradeScale,
  NationalGrade,
  type Prisma,
  SemesterGradeStatus,
  TermControlForm,
  UserRole,
} from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { activeStudentWhere } from '@/libs/common/active-student'
import { resolveOwnStudentId } from '@/libs/common/own-student'
import { AttendanceSummaryService } from '@/attendance/attendance-summary.service'

import type { BulkGradeEntryDto, CreateSemesterGradeDto } from './dto/create-semester-grade.dto'
import type { GradesByComponentTermQueryDto, GradesByStudentQueryDto } from './dto/grade-query.dto'
import type {
  GradeScaleInfoDto,
  GradeSheetDto,
  GradeSheetStudentDto,
  SemesterGradeDto,
  StudentTranscriptDto,
  StudentTranscriptGradeDto,
  TeacherDisciplineDto,
} from './dto/grade-response.dto'
import { GradeScaleService } from './grade-scale.service'
import {
  FIVE_POINT_MAX,
  FIVE_POINT_MIN,
  MAX_ATTEMPTS,
  TWELVE_POINT_MAX,
  TWELVE_POINT_MIN,
  isElevatedGrades,
} from './grades.constants'

export interface GradesActor {
  userId: string
  role: UserRole
}

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name)

  public constructor(
    private readonly prisma: PrismaService,
    private readonly scaleService: GradeScaleService,
    private readonly attendanceSummaryService: AttendanceSummaryService,
  ) {}

  // ── Record single grade ────────────────────────────────────────────────────

  public async recordGrade(dto: CreateSemesterGradeDto, actor: GradesActor): Promise<SemesterGradeDto> {
    await this.assertCanGrade(dto.curriculumComponentTermId, actor)

    const term = await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
      where: { id: dto.curriculumComponentTermId },
      select: {
        controlForm: true,
        semesterNumber: true,
        component: {
          select: {
            name: true,
            code: true,
            section: { select: { sectionType: true } },
          },
        },
      },
    })

    const controlForm = term.controlForm ?? TermControlForm.EXAM
    const gradeScale = this.scaleService.scaleFromSectionType(term.component.section.sectionType)

    const { finalGrade, nationalGrade } = this.resolveGradeValues(
      dto.finalGrade ?? null,
      dto.nationalGradeOverride ?? null,
      gradeScale,
      controlForm,
    )

    const currentMax = await this.prisma.semesterGrade.aggregate({
      where: {
        studentId: dto.studentId,
        curriculumComponentTermId: dto.curriculumComponentTermId,
      },
      _max: { attempt: true },
    })
    const prevAttempt = currentMax._max.attempt ?? 0
    const newAttempt = dto.isRetake ? prevAttempt + 1 : (prevAttempt === 0 ? 1 : prevAttempt + 1)

    if (newAttempt > MAX_ATTEMPTS) {
      throw new BadRequestException(`Максимальна кількість спроб — ${MAX_ATTEMPTS}`)
    }

    return this.prisma.$transaction(async (tx) => {
      if (newAttempt > 1) {
        await tx.semesterGrade.updateMany({
          where: {
            studentId: dto.studentId,
            curriculumComponentTermId: dto.curriculumComponentTermId,
            status: SemesterGradeStatus.ACTIVE,
          },
          data: { status: SemesterGradeStatus.SUPERSEDED },
        })
      }

      const previousActive = newAttempt > 1
        ? await tx.semesterGrade.findFirst({
            where: {
              studentId: dto.studentId,
              curriculumComponentTermId: dto.curriculumComponentTermId,
              attempt: prevAttempt,
            },
            select: { id: true },
          })
        : null

      const created = await tx.semesterGrade.create({
        data: {
          studentId: dto.studentId,
          curriculumComponentTermId: dto.curriculumComponentTermId,
          academicYear: dto.academicYear,
          controlForm,
          gradeScale,
          finalGrade,
          nationalGrade,
          attempt: newAttempt,
          status: SemesterGradeStatus.ACTIVE,
          previousAttemptId: previousActive?.id ?? null,
          recordedById: actor.userId,
        },
        include: {
          student: { select: { personFIO: true } },
        },
      })

      return this.mapToDto(created, term.component.name, term.component.code, term.semesterNumber)
    })
  }

  // ── Bulk grade entry ───────────────────────────────────────────────────────

  public async recordGradesBulk(dto: BulkGradeEntryDto, actor: GradesActor): Promise<SemesterGradeDto[]> {
    await this.assertCanGrade(dto.curriculumComponentTermId, actor)

    const term = await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
      where: { id: dto.curriculumComponentTermId },
      select: {
        controlForm: true,
        semesterNumber: true,
        component: {
          select: {
            name: true,
            code: true,
            section: { select: { sectionType: true } },
          },
        },
      },
    })

    const controlForm = term.controlForm ?? TermControlForm.EXAM
    const gradeScale = this.scaleService.scaleFromSectionType(term.component.section.sectionType)

    const students = await this.prisma.student.findMany({
      where: { groupId: dto.groupId, ...activeStudentWhere() },
      select: { id: true },
    })
    const validStudentIds = new Set(students.map((s) => s.id))

    for (const g of dto.grades) {
      if (!validStudentIds.has(g.studentId)) {
        throw new BadRequestException(`Студент ${g.studentId} не належить до групи`)
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const results: SemesterGradeDto[] = []

      for (const g of dto.grades) {
        const { finalGrade, nationalGrade } = this.resolveGradeValues(
          g.finalGrade ?? null,
          g.nationalGradeOverride ?? null,
          gradeScale,
          controlForm,
        )

        const existing = await tx.semesterGrade.findFirst({
          where: {
            studentId: g.studentId,
            curriculumComponentTermId: dto.curriculumComponentTermId,
            status: SemesterGradeStatus.ACTIVE,
          },
          select: { id: true, attempt: true },
        })

        if (existing) {
          const updated = await tx.semesterGrade.update({
            where: { id: existing.id },
            data: { finalGrade, nationalGrade, recordedById: actor.userId },
            include: { student: { select: { personFIO: true } } },
          })
          results.push(this.mapToDto(updated, term.component.name, term.component.code, term.semesterNumber))
        } else {
          const created = await tx.semesterGrade.create({
            data: {
              studentId: g.studentId,
              curriculumComponentTermId: dto.curriculumComponentTermId,
              academicYear: dto.academicYear,
              controlForm,
              gradeScale,
              finalGrade,
              nationalGrade,
              attempt: 1,
              status: SemesterGradeStatus.ACTIVE,
              recordedById: actor.userId,
            },
            include: { student: { select: { personFIO: true } } },
          })
          results.push(this.mapToDto(created, term.component.name, term.component.code, term.semesterNumber))
        }
      }

      return results
    })
  }

  // ── Grade sheet (відомість) ────────────────────────────────────────────────

  public async getGradeSheet(
    componentTermId: string,
    query: GradesByComponentTermQueryDto,
  ): Promise<GradeSheetDto> {
    const term = await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
      where: { id: componentTermId },
      select: {
        ects: true,
        hours: true,
        controlForm: true,
        semesterNumber: true,
        component: {
          select: {
            name: true,
            code: true,
            section: { select: { sectionType: true } },
          },
        },
      },
    })

    const gradeScale = this.scaleService.scaleFromSectionType(term.component.section.sectionType)

    const students = await this.prisma.student.findMany({
      where: { groupId: query.groupId, ...activeStudentWhere() },
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    const grades = await this.prisma.semesterGrade.findMany({
      where: {
        curriculumComponentTermId: componentTermId,
        academicYear: query.academicYear,
        status: SemesterGradeStatus.ACTIVE,
        studentId: { in: students.map((s) => s.id) },
      },
      include: { student: { select: { personFIO: true } } },
    })

    const gradeByStudent = new Map(grades.map((g) => [g.studentId, g]))

    // Середня поточна оцінка (AttendanceRecord.grade) — підказка для формули ваг.
    const attendanceSummary = await this.attendanceSummaryService.getAttendanceSummary(
      componentTermId,
      query.groupId,
      query.academicYear,
      term.semesterNumber,
    )
    const averageByStudent = new Map(
      attendanceSummary.students.map((s) => [s.studentId, s.averageGrade]),
    )

    const sheetStudents: GradeSheetStudentDto[] = students.map((s) => {
      const g = gradeByStudent.get(s.id)
      return {
        studentId: s.id,
        fullName: s.personFIO,
        grade: g
          ? this.mapToDto(g, term.component.name, term.component.code, term.semesterNumber)
          : null,
        currentAverage: averageByStudent.get(s.id) ?? null,
      }
    })

    return {
      curriculumComponentTermId: componentTermId,
      subjectName: term.component.name,
      componentCode: term.component.code,
      controlForm: term.controlForm,
      gradeScale,
      ects: Number(term.ects),
      totalHours: term.hours,
      semesterNumber: term.semesterNumber,
      students: sheetStudents,
    }
  }

  // ── Student transcript (залікова книжка) ───────────────────────────────────

  public async getStudentTranscript(
    studentId: string,
    query: GradesByStudentQueryDto,
    actor?: GradesActor,
  ): Promise<StudentTranscriptDto> {
    // IDOR-захист: для ролі STUDENT переданий studentId ігнорується — завжди власний.
    if (actor?.role === UserRole.STUDENT) {
      studentId = await resolveOwnStudentId(this.prisma, actor.userId)
    }

    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { personFIO: true },
    })

    const where: Prisma.SemesterGradeWhereInput = {
      studentId,
      status: SemesterGradeStatus.ACTIVE,
    }
    if (query.academicYear) where.academicYear = query.academicYear
    if (query.semesterNumber) {
      where.curriculumComponentTerm = { semesterNumber: query.semesterNumber }
    }

    const grades = await this.prisma.semesterGrade.findMany({
      where,
      include: {
        curriculumComponentTerm: {
          select: {
            ects: true,
            semesterNumber: true,
            component: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: [
        { curriculumComponentTerm: { semesterNumber: 'asc' } },
        { curriculumComponentTerm: { component: { name: 'asc' } } },
      ],
    })

    const transcriptGrades: StudentTranscriptGradeDto[] = grades.map((g) => ({
      id: g.id,
      subjectName: g.curriculumComponentTerm.component.name,
      componentCode: g.curriculumComponentTerm.component.code,
      ects: Number(g.curriculumComponentTerm.ects),
      semesterNumber: g.curriculumComponentTerm.semesterNumber,
      controlForm: g.controlForm,
      gradeScale: g.gradeScale,
      finalGrade: g.finalGrade,
      nationalGrade: g.nationalGrade,
      attempt: g.attempt,
    }))

    return {
      studentId,
      fullName: student.personFIO,
      grades: transcriptGrades,
    }
  }

  // ── Retake history ─────────────────────────────────────────────────────────

  public async getRetakeHistory(
    studentId: string,
    componentTermId: string,
    actor?: GradesActor,
  ): Promise<SemesterGradeDto[]> {
    // IDOR-захист: для ролі STUDENT переданий studentId ігнорується — завжди власний.
    if (actor?.role === UserRole.STUDENT) {
      studentId = await resolveOwnStudentId(this.prisma, actor.userId)
    }

    const grades = await this.prisma.semesterGrade.findMany({
      where: { studentId, curriculumComponentTermId: componentTermId },
      include: {
        student: { select: { personFIO: true } },
        curriculumComponentTerm: {
          select: {
            semesterNumber: true,
            component: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { attempt: 'asc' },
    })

    return grades.map((g) =>
      this.mapToDto(
        g,
        g.curriculumComponentTerm.component.name,
        g.curriculumComponentTerm.component.code,
        g.curriculumComponentTerm.semesterNumber,
      ),
    )
  }

  // ── Teacher's disciplines ──────────────────────────────────────────────────

  public async getMyDisciplines(
    userId: string,
    academicYear: string,
  ): Promise<TeacherDisciplineDto[]> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      select: { id: true },
    })
    if (!teacher) throw new NotFoundException('Викладача не знайдено')

    const assignments = await this.prisma.teacherLoadSubjectAssignment.findMany({
      where: {
        primaryTeacherId: teacher.id,
        academicYear,
      },
      select: {
        curriculumComponentTermId: true,
        groupId: true,
        group: { select: { name: true } },
        academicYear: true,
        curriculumComponentTerm: {
          select: {
            controlForm: true,
            semesterNumber: true,
            component: {
              select: {
                name: true,
                code: true,
                section: { select: { sectionType: true } },
              },
            },
          },
        },
      },
    })

    return assignments.map((a) => ({
      curriculumComponentTermId: a.curriculumComponentTermId,
      subjectName: a.curriculumComponentTerm.component.name,
      componentCode: a.curriculumComponentTerm.component.code,
      semesterNumber: a.curriculumComponentTerm.semesterNumber,
      controlForm: a.curriculumComponentTerm.controlForm,
      gradeScale: this.scaleService.scaleFromSectionType(
        a.curriculumComponentTerm.component.section.sectionType,
      ),
      groupId: a.groupId,
      groupName: a.group?.name ?? null,
      academicYear: a.academicYear,
    }))
  }

  // ── Scale info ─────────────────────────────────────────────────────────────

  public async getScaleInfo(componentTermId: string): Promise<GradeScaleInfoDto> {
    const term = await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
      where: { id: componentTermId },
      select: {
        controlForm: true,
        component: {
          select: { section: { select: { sectionType: true } } },
        },
      },
    })

    const gradeScale = this.scaleService.scaleFromSectionType(term.component.section.sectionType)
    const [min, max] = gradeScale === 'TWELVE_POINT'
      ? [TWELVE_POINT_MIN, TWELVE_POINT_MAX]
      : [FIVE_POINT_MIN, FIVE_POINT_MAX]

    return { gradeScale, min, max, controlForm: term.controlForm }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private resolveGradeValues(
    finalGrade: number | null,
    nationalGradeOverride: NationalGrade | null,
    gradeScale: GradeScale,
    controlForm: TermControlForm,
  ): { finalGrade: number | null; nationalGrade: NationalGrade } {
    if (controlForm === TermControlForm.CREDIT) {
      if (!nationalGradeOverride) {
        throw new BadRequestException('Для заліку необхідно вказати nationalGradeOverride (PASSED/NOT_PASSED)')
      }
      this.scaleService.validateCreditGrade(nationalGradeOverride)
      return { finalGrade: null, nationalGrade: nationalGradeOverride }
    }

    this.scaleService.validateGrade(finalGrade, gradeScale, controlForm)
    const nationalGrade = this.scaleService.toNationalGrade(finalGrade, gradeScale, controlForm)
    return { finalGrade, nationalGrade }
  }

  private async assertCanGrade(componentTermId: string, actor: GradesActor): Promise<void> {
    if (isElevatedGrades(actor.role)) return

    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('Тільки викладач або керівництво може виставляти оцінки')
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: actor.userId },
      select: { id: true },
    })
    if (!teacher) throw new ForbiddenException('Профіль викладача не знайдено')

    const assignment = await this.prisma.teacherLoadSubjectAssignment.findFirst({
      where: {
        primaryTeacherId: teacher.id,
        curriculumComponentTermId: componentTermId,
      },
    })
    if (!assignment) {
      throw new ForbiddenException('Ви не закріплені за цією дисципліною')
    }
  }

  private mapToDto(
    grade: {
      id: string
      studentId: string
      curriculumComponentTermId: string
      academicYear: string
      controlForm: TermControlForm
      gradeScale: GradeScale
      finalGrade: number | null
      nationalGrade: NationalGrade
      attempt: number
      status: SemesterGradeStatus
      recordedById: string
      recordedAt: Date
      student: { personFIO: string }
    },
    subjectName: string,
    componentCode: string | null,
    semesterNumber: number,
  ): SemesterGradeDto {
    return {
      id: grade.id,
      studentId: grade.studentId,
      studentName: grade.student.personFIO,
      curriculumComponentTermId: grade.curriculumComponentTermId,
      subjectName,
      componentCode,
      academicYear: grade.academicYear,
      semesterNumber,
      controlForm: grade.controlForm,
      gradeScale: grade.gradeScale,
      finalGrade: grade.finalGrade,
      nationalGrade: grade.nationalGrade,
      attempt: grade.attempt,
      status: grade.status,
      recordedById: grade.recordedById,
      recordedAt: grade.recordedAt.toISOString(),
    }
  }
}
