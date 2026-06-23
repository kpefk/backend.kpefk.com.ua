import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

import { AttendanceStatus, LessonType } from '@prisma/client'

import { GRADE_MAX, GRADE_MIN } from '../attendance.constants'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

// ─── Query DTOs ───────────────────────────────────────────────────────────────

export class ListLessonsQueryDto {
  @Matches(DATE_ONLY, { message: 'date має бути у форматі YYYY-MM-DD.' })
  date!: string

  /** Керівництво: переглянути заняття конкретного викладача. */
  @IsOptional()
  @IsUUID('4')
  teacherId?: string

  /** Керівництво: переглянути всі заняття групи. */
  @IsOptional()
  @IsUUID('4')
  groupId?: string
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export class OpenSessionDto {
  @IsUUID('4')
  scheduleEntryId!: string

  @Matches(DATE_ONLY, { message: 'date має бути у форматі YYYY-MM-DD.' })
  date!: string

  @IsOptional()
  @IsEnum(LessonType)
  lessonType?: LessonType

  @IsOptional()
  @IsString()
  @MaxLength(500)
  topic?: string
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  topic?: string

  @IsOptional()
  @IsEnum(LessonType)
  lessonType?: LessonType
}

export class AttendanceRecordInputDto {
  @IsUUID('4')
  studentId!: string

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus

  @IsOptional()
  @IsInt()
  @Min(GRADE_MIN)
  @Max(GRADE_MAX)
  grade?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string | null
}

export class SaveRecordsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordInputDto)
  records!: AttendanceRecordInputDto[]
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class LessonSlotDto {
  scheduleEntryId!: string
  groupId!: string
  groupName!: string
  curriculumComponentTermId!: string
  componentCode!: string | null
  subjectName!: string
  slotNumber!: number
  startTime!: string
  endTime!: string
  subgroupNumber!: number | null
  classroomNumber!: string | null
  isSubstituteTeacher!: boolean
  /** Чи вже існує сторінка журналу для цього заняття на дату. */
  hasSession!: boolean
  sessionId!: string | null
  topic!: string | null
}

export class AttendanceRowDto {
  studentId!: string
  fullName!: string
  /** userId для лінку на профіль (якщо студент має акаунт). */
  userId!: string | null
  status!: AttendanceStatus
  grade!: number | null
  comment!: string | null
}

export class LessonSessionDto {
  id!: string
  date!: string
  academicYear!: string
  semesterNumber!: number
  groupId!: string
  groupName!: string
  curriculumComponentTermId!: string
  subjectName!: string
  componentCode!: string | null
  slotNumber!: number
  startTime!: string
  endTime!: string
  subgroupNumber!: number
  lessonType!: LessonType
  topic!: string | null
  teacherId!: string
  canEdit!: boolean
  rows!: AttendanceRowDto[]
}
