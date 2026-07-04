import { Type } from 'class-transformer'
import { IsInt, IsString, IsUUID } from 'class-validator'

// ─── Query DTOs ──────────────────────────────────────────────────────────────

export class AttendanceSummaryQueryDto {
  @IsUUID('4')
  componentTermId!: string

  @IsUUID('4')
  groupId!: string

  @IsString()
  academicYear!: string

  @Type(() => Number)
  @IsInt()
  semesterNumber!: number
}

export class StudentSummaryQueryDto {
  @IsString()
  academicYear!: string

  @Type(() => Number)
  @IsInt()
  semesterNumber!: number
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class AttendanceSummaryStudentDto {
  studentId!: string
  fullName!: string
  totalLessons!: number
  attended!: number
  late!: number
  absent!: number
  attendancePercent!: number
  averageGrade!: number | null
}

export class AttendanceSummaryDto {
  componentTermId!: string
  subjectName!: string
  students!: AttendanceSummaryStudentDto[]
}

export class StudentDisciplineSummaryDto {
  componentTermId!: string
  subjectName!: string
  componentCode!: string | null
  totalLessons!: number
  attended!: number
  late!: number
  absent!: number
  attendancePercent!: number
  averageGrade!: number | null
}

export class StudentSemesterSummaryDto {
  studentId!: string
  fullName!: string
  disciplines!: StudentDisciplineSummaryDto[]
}
