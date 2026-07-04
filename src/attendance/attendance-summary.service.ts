import { Injectable, NotFoundException } from '@nestjs/common'
import { AttendanceStatus, UserRole } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { activeStudentWhere } from '@/libs/common/active-student'
import { resolveOwnStudentId } from '@/libs/common/own-student'

import type {
  AttendanceSummaryDto,
  AttendanceSummaryStudentDto,
  StudentDisciplineSummaryDto,
  StudentSemesterSummaryDto,
} from './dto/attendance-summary.dto'

@Injectable()
export class AttendanceSummaryService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Зведена відвідуваності по дисципліні за семестр.
   * Per student: totalLessons, attended, late, absent, attendancePercent, averageGrade.
   */
  public async getAttendanceSummary(
    componentTermId: string,
    groupId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<AttendanceSummaryDto> {
    const sessions = await this.prisma.lessonSession.findMany({
      where: {
        curriculumComponentTermId: componentTermId,
        groupId,
        academicYear,
        semesterNumber,
        deletedAt: null,
      },
      select: { id: true },
    })

    const componentTerm = await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
      where: { id: componentTermId },
      select: { component: { select: { name: true } } },
    })

    const lessonSessionIds = sessions.map((s) => s.id)

    const students = await this.prisma.student.findMany({
      where: { groupId, ...activeStudentWhere() },
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    if (lessonSessionIds.length === 0) {
      return {
        componentTermId,
        subjectName: componentTerm.component.name,
        students: students.map((s) => ({
          studentId: s.id,
          fullName: s.personFIO,
          totalLessons: 0,
          attended: 0,
          late: 0,
          absent: 0,
          attendancePercent: 0,
          averageGrade: null,
        })),
      }
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { lessonSessionId: { in: lessonSessionIds } },
      select: { studentId: true, status: true, grade: true },
    })

    const summaryMap = new Map<string, { attended: number; late: number; absent: number; grades: number[] }>()

    for (const r of records) {
      let entry = summaryMap.get(r.studentId)
      if (!entry) {
        entry = { attended: 0, late: 0, absent: 0, grades: [] }
        summaryMap.set(r.studentId, entry)
      }

      if (r.status === AttendanceStatus.PRESENT) entry.attended++
      else if (r.status === AttendanceStatus.LATE) entry.late++
      else if (r.status === AttendanceStatus.ABSENT) entry.absent++

      if (r.grade !== null) entry.grades.push(r.grade)
    }

    const totalLessons = lessonSessionIds.length
    const result: AttendanceSummaryStudentDto[] = students.map((s) => {
      const entry = summaryMap.get(s.id)
      const attended = entry?.attended ?? 0
      const late = entry?.late ?? 0
      const absent = entry?.absent ?? 0
      const presentCount = attended + late

      return {
        studentId: s.id,
        fullName: s.personFIO,
        totalLessons,
        attended,
        late,
        absent,
        attendancePercent: totalLessons > 0 ? Math.round((presentCount / totalLessons) * 100) : 0,
        averageGrade: entry && entry.grades.length > 0
          ? Math.round((entry.grades.reduce((a, b) => a + b, 0) / entry.grades.length) * 10) / 10
          : null,
      }
    })

    return {
      componentTermId,
      subjectName: componentTerm.component.name,
      students: result,
    }
  }

  /**
   * Зведена по всіх дисциплінах для одного студента за семестр.
   */
  public async getStudentSemesterSummary(
    studentId: string,
    academicYear: string,
    semesterNumber: number,
    actor?: { userId: string; role: UserRole },
  ): Promise<StudentSemesterSummaryDto> {
    // IDOR-захист: для ролі STUDENT переданий studentId ігнорується — завжди власний.
    if (actor?.role === UserRole.STUDENT) {
      studentId = await resolveOwnStudentId(this.prisma, actor.userId)
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { personFIO: true },
    })
    if (!student) throw new NotFoundException('Студента не знайдено')

    const sessions = await this.prisma.lessonSession.findMany({
      where: {
        academicYear,
        semesterNumber,
        deletedAt: null,
        records: { some: { studentId } },
      },
      select: {
        id: true,
        curriculumComponentTermId: true,
        curriculumComponentTerm: {
          select: { component: { select: { name: true, code: true } } },
        },
      },
    })

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        lessonSessionId: { in: sessions.map((s) => s.id) },
      },
      select: { lessonSessionId: true, status: true, grade: true },
    })

    const recordBySession = new Map(records.map((r) => [r.lessonSessionId, r]))

    const byTerm = new Map<string, {
      name: string
      code: string | null
      total: number
      attended: number
      late: number
      absent: number
      grades: number[]
    }>()

    for (const s of sessions) {
      const termId = s.curriculumComponentTermId
      let entry = byTerm.get(termId)
      if (!entry) {
        entry = {
          name: s.curriculumComponentTerm.component.name,
          code: s.curriculumComponentTerm.component.code,
          total: 0,
          attended: 0,
          late: 0,
          absent: 0,
          grades: [],
        }
        byTerm.set(termId, entry)
      }

      entry.total++
      const rec = recordBySession.get(s.id)
      if (rec) {
        if (rec.status === AttendanceStatus.PRESENT) entry.attended++
        else if (rec.status === AttendanceStatus.LATE) entry.late++
        else if (rec.status === AttendanceStatus.ABSENT) entry.absent++
        if (rec.grade !== null) entry.grades.push(rec.grade)
      }
    }

    const disciplines: StudentDisciplineSummaryDto[] = Array.from(byTerm.entries()).map(
      ([termId, e]) => {
        const presentCount = e.attended + e.late
        return {
          componentTermId: termId,
          subjectName: e.name,
          componentCode: e.code,
          totalLessons: e.total,
          attended: e.attended,
          late: e.late,
          absent: e.absent,
          attendancePercent: e.total > 0 ? Math.round((presentCount / e.total) * 100) : 0,
          averageGrade: e.grades.length > 0
            ? Math.round((e.grades.reduce((a, b) => a + b, 0) / e.grades.length) * 10) / 10
            : null,
        }
      },
    )

    disciplines.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'uk'))

    return {
      studentId,
      fullName: student.personFIO,
      disciplines,
    }
  }
}
