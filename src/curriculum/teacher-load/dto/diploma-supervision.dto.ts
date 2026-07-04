import { IsEnum, IsUUID } from 'class-validator'

import { SupervisionRole } from '@prisma/client'

// ─── Response DTOs ────────────────────────────────────────────────────────────

/** Одне персональне призначення (керівник або консультант) на дипломну роботу студента. */
export class DiplomaAssignmentDto {
  id!: string
  teacherId!: string
  teacherName!: string
  role!: SupervisionRole
  /** Обчислено: 16 / кількість призначених цьому студенту (Наказ МОН №686, п.20). */
  hours!: number
}

/** Один студент зі списку доступних для призначення керівника дипломної роботи. */
export class DiplomaStudentRowDto {
  studentId!: string
  studentName!: string
  assignments!: DiplomaAssignmentDto[]
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

/** POST /teacher-load/diploma-supervision */
export class AssignDiplomaSupervisionDto {
  @IsUUID('4', { message: 'studentId має бути валідним UUID.' })
  studentId!: string

  @IsUUID('4', { message: 'curriculumComponentTermId має бути валідним UUID.' })
  curriculumComponentTermId!: string

  @IsUUID('4', { message: 'workingCurriculumId має бути валідним UUID.' })
  workingCurriculumId!: string

  @IsUUID('4', { message: 'teacherId має бути валідним UUID.' })
  teacherId!: string

  @IsEnum(SupervisionRole)
  role!: SupervisionRole
}

export class AssignDiplomaSupervisionResultDto {
  /** Нормативні попередження (не блокуючі), напр. перевищення 8 робіт на керівника (п.20). */
  warnings!: string[]
}
