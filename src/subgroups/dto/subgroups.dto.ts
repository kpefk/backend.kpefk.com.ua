import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

import { MAX_SUBGROUPS } from '../subgroups.constants'

// ─── Query DTOs ───────────────────────────────────────────────────────────────

/** GET /subgroups — перелік дисциплін групи, що діляться на підгрупи. */
export class SubgroupSubjectsQueryDto {
  @IsUUID('4')
  groupId!: string

  @IsString()
  academicYear!: string

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  semesterNumber!: number
}

/** GET /subgroups/:componentTermId — поточний поділ. */
export class SubgroupSplitQueryDto {
  @IsUUID('4')
  groupId!: string

  @IsString()
  academicYear!: string
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export class SubgroupAssignmentDto {
  @IsUUID('4')
  studentId!: string

  @IsInt()
  @Min(1)
  @Max(MAX_SUBGROUPS)
  subgroupNumber!: number
}

/** PUT /subgroups/:componentTermId — замінити повний поділ. */
export class SetSubgroupsDto {
  @IsUUID('4')
  groupId!: string

  @IsString()
  academicYear!: string

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SubgroupAssignmentDto)
  assignments!: SubgroupAssignmentDto[]
}

/** POST /subgroups/:componentTermId/auto-split — рівномірний поділ за списком. */
export class AutoSplitDto {
  @IsUUID('4')
  groupId!: string

  @IsString()
  academicYear!: string

  @IsInt()
  @Min(2)
  @Max(MAX_SUBGROUPS)
  subgroupCount!: number
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class SubgroupSubjectDto {
  componentTermId!: string
  componentCode!: string | null
  componentName!: string
  /** Скільки підгруп передбачає РНП. */
  subgroupCount!: number
  /** Кількість студентів у кожній підгрупі (індекс 0 = підгрупа 1). */
  assignedCounts!: number[]
  /** Скільки активних студентів ще не призначено в жодну підгрупу. */
  unassignedCount!: number
}

export class SubgroupStudentDto {
  studentId!: string
  fullName!: string
  /** 0 = не призначено; 1..N — номер підгрупи. */
  subgroupNumber!: number
}

export class SubgroupSplitDto {
  componentTermId!: string
  componentName!: string
  subgroupCount!: number
  groupId!: string
  students!: SubgroupStudentDto[]
}
