import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'

import { LoadDistributionMode } from '@prisma/client'
import type { LessonType, LoadStatus } from '@prisma/client'

// ─── Shared teacher reference ─────────────────────────────────────────────────

/** Компактна відповідь про викладача (для вкладених полів) */
export class TeacherRefDto {
  id!: string
  lastName!: string
  firstName!: string
  middleName!: string | null
  /** Прізвище + ім'я + по батькові (розраховується на backend) */
  fullName!: string
  positionName!: string | null
  departmentName!: string | null
  rate!: number
}

// ─── Lesson-level response ────────────────────────────────────────────────────

/** Один вид заняття в рамках TeacherLoadSubjectAssignment */
export class LessonAssignmentDto {
  id!: string
  lessonType!: LessonType
  subgroupNumber!: number | null
  hours!: number

  /**
   * Викладач-виняток для цього виду заняття.
   * null → вид заняття веде primaryTeacher батьківського суб'єкта.
   */
  overrideTeacher!: TeacherRefDto | null

  /**
   * Фактичний викладач (computed, не зберігається в БД):
   *   effectiveTeacher = overrideTeacher ?? parent.primaryTeacher
   */
  effectiveTeacher!: TeacherRefDto | null

  createdAt!: string
  updatedAt!: string
}

// ─── Subject-level response ───────────────────────────────────────────────────

/** Призначення навантаження на рівні освітнього компонента */
export class SubjectAssignmentDto {
  id!: string
  workingCurriculumId!: string
  curriculumComponentTermId!: string
  componentId!: string
  componentCode!: string | null
  componentName!: string
  semesterNumber!: number
  /** null = потоковий (лекції); string = конкретна група */
  groupId!: string | null
  groupName!: string | null
  academicYear!: string
  /** Основний викладач компонента */
  primaryTeacher!: TeacherRefDto | null
  status!: LoadStatus
  orderNumber!: string | null
  orderDate!: string | null
  assignedById!: string
  signedByDirectorId!: string | null
  /** Режим розподілу практик/лаб для ОК-семестру (спільний для всіх його subject'ів). */
  practiceMode!: LoadDistributionMode
  labMode!: LoadDistributionMode
  /** Кількість підгруп (1 = без поділу). */
  subgroupCount!: number
  /** Сума годин по всіх lesson rows */
  totalHours!: number
  lessons!: LessonAssignmentDto[]
  /** Нормативні попередження (не блокуючі) */
  warnings!: string[]
  createdAt!: string
  updatedAt!: string
}

// ─── Confirm result ───────────────────────────────────────────────────────────

export class ConfirmSubjectAssignmentsResultDto {
  confirmed!: number
  warnings!: string[]
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

/** PATCH /teacher-load/subject-assignments/:id */
export class UpdateSubjectAssignmentDto {
  /**
   * Передавати явно null щоб зняти основного викладача.
   * Не передавати — поле не змінюється.
   */
  @IsOptional()
  @ValidateIf((o: UpdateSubjectAssignmentDto) => o.primaryTeacherId !== null)
  @IsString()
  primaryTeacherId?: string | null
}

/** PATCH /teacher-load/lesson-assignments/:id */
export class UpdateLessonAssignmentDto {
  /**
   * Передавати явно null щоб прибрати override (відновлює primaryTeacher).
   * Не передавати — поле не змінюється.
   */
  @IsOptional()
  @ValidateIf((o: UpdateLessonAssignmentDto) => o.overrideTeacherId !== null)
  @IsString()
  overrideTeacherId?: string | null

  @IsOptional()
  @ValidateIf((o: UpdateLessonAssignmentDto) => o.subgroupNumber !== null)
  @IsInt()
  @Min(1)
  subgroupNumber?: number | null
}

/** POST /teacher-load/subject-assignments/confirm */
export class ConfirmSubjectAssignmentsDto {
  @IsUUID('4', { message: 'workingCurriculumId має бути валідним UUID.' })
  workingCurriculumId!: string

  @IsString()
  orderNumber!: string

  @IsDateString({}, { message: 'orderDate має бути ISO 8601 датою.' })
  orderDate!: string
}

/** POST /teacher-load/subject-assignments/revoke */
export class RevokeSubjectAssignmentsDto {
  @IsUUID('4', { message: 'workingCurriculumId має бути валідним UUID.' })
  workingCurriculumId!: string

  /** Причина скасування наказу (для аудиту). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

export class RevokeSubjectAssignmentsResultDto {
  /** Кількість записів, повернених у статус DRAFT. */
  reverted!: number
}

/** PATCH /teacher-load/distribution-mode — режим розподілу практик/лаб для ОК-семестру. */
export class SetDistributionModeDto {
  @IsUUID('4')
  workingCurriculumId!: string

  @IsUUID('4')
  curriculumComponentTermId!: string

  @IsOptional()
  @IsEnum(LoadDistributionMode)
  practiceMode?: LoadDistributionMode

  @IsOptional()
  @IsEnum(LoadDistributionMode)
  labMode?: LoadDistributionMode

  /** Кількість підгруп (1 = без поділу; ≥2 — усі види занять ведуться окремо). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  subgroupCount?: number
}
