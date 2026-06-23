import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator'

import {
  ClassroomType,
  LessonType,
  SubstitutionType,
  WeekParity,
  ScheduleStatus,
} from '@prisma/client'

// ─── Shared refs ──────────────────────────────────────────────────────────────

export class ScheduleTeacherRefDto {
  id!: string
  lastName!: string
  firstName!: string
  middleName!: string | null
  /** Прізвище І.Б. (розраховується на backend) */
  shortName!: string
}

export class ScheduleClassroomRefDto {
  id!: string
  number!: string
  name!: string
}

/** Оперативна заміна/перенесення/скасування заняття на дату (ТЗ §3.8, §7.3). */
export class ScheduleSubstitutionDto {
  id!: string
  entryId!: string
  /** ISO-дата, на яку діє заміна. */
  date!: string
  type!: SubstitutionType
  newDayOfWeek!: number | null
  newSlotNumber!: number | null
  replacementTeacher!: ScheduleTeacherRefDto | null
  replacementClassroom!: ScheduleClassroomRefDto | null
  reason!: string | null
  createdAt!: string
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class ScheduleEntryDto {
  id!: string
  dayOfWeek!: number
  slotNumber!: number
  weekParity!: WeekParity
  lessonType!: LessonType
  subgroupNumber!: number | null

  curriculumComponentTermId!: string
  componentCode!: string | null
  subjectName!: string

  teacher!: ScheduleTeacherRefDto | null
  classroom!: ScheduleClassroomRefDto | null

  /** Посилання на онлайн-конференцію (дистанційне/змішане заняття, ТЗ §3.6). */
  onlineUrl!: string | null

  /** Оперативні заміни/перенесення на конкретні дати (ТЗ §3.8). */
  substitutions!: ScheduleSubstitutionDto[]

  /** Конфлікти (викладач/аудиторія/група/місткість/тип) — не блокуючі. */
  conflicts!: string[]

  createdAt!: string
  updatedAt!: string
}

export class ScheduleDto {
  id!: string
  groupId!: string
  groupName!: string
  workingCurriculumId!: string
  academicYear!: string
  semesterNumber!: number
  status!: ScheduleStatus
  generatedAt!: string | null
  /** День виховної години (1=Пн..5=Пт) або null, якщо не призначено (ТЗ §3.5). */
  homeroomDayOfWeek!: number | null
  entries!: ScheduleEntryDto[]
}

/** Відповідь GET /schedule — schedule може бути null, якщо ще не створено / нема РНП. */
export class ScheduleResponseDto {
  hasWorkingCurriculum!: boolean
  workingCurriculumId!: string | null
  schedule!: ScheduleDto | null
  warnings!: string[]
}

/** Відповідь POST /schedule/generate. */
export class GenerateScheduleResultDto {
  schedule!: ScheduleDto
  warnings!: string[]
}

/** Результат генерації для однієї групи в межах масової генерації. */
export class GenerateAllGroupResultDto {
  groupId!: string
  groupName!: string
  /** Наскрізний семестр групи, що згенеровано для цього періоду. */
  semesterNumber!: number
  entries!: number
  warnings!: string[]
}

/** Відповідь POST /schedule/generate-all (масова генерація всім групам). */
export class GenerateAllResultDto {
  academicYear!: string
  /** Семестр навчального року: 1 = осінній, 2 = весняний. */
  term!: number
  /** Скільки груп опрацьовано. */
  groupsProcessed!: number
  /** Сумарно створено занять по всіх групах. */
  totalEntries!: number
  results!: GenerateAllGroupResultDto[]
}

/** Група в селекторі розкладу + прапор наявності РНП на рік. */
export class EligibleGroupDto {
  groupId!: string
  groupName!: string
  hasWorkingCurriculum!: boolean
  workingCurriculumId!: string | null
  /** Семестри робочого плану на цей рік (для селектора семестру). */
  semesterNumbers!: number[]
}

/** Доступний для додавання вид заняття (з дефолтним викладачем із навантаження). */
export class AvailableLessonOptionDto {
  lessonType!: LessonType
  defaultTeacher!: ScheduleTeacherRefDto | null
}

/** Дисципліна РНП, доступна для ручного додавання в розклад. */
export class AvailableSubjectDto {
  curriculumComponentTermId!: string
  componentCode!: string | null
  componentName!: string
  semesterNumber!: number
  subgroupCount!: number
  lessonOptions!: AvailableLessonOptionDto[]
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export class GenerateScheduleDto {
  @IsUUID('4', { message: 'groupId має бути валідним UUID.' })
  groupId!: string

  @IsString()
  academicYear!: string

  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number
}

/** Масова генерація розкладу всім групам із РНП на цей рік+семестр. */
export class GenerateAllSchedulesDto {
  @IsString()
  academicYear!: string

  /** Позиція семестру в навчальному році: 1 = осінній, 2 = весняний. */
  @IsInt()
  @Min(1)
  @Max(2)
  semesterNumber!: number
}

export class CreateScheduleEntryDto {
  @IsUUID('4')
  groupId!: string

  @IsString()
  academicYear!: string

  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number

  @IsInt()
  @Min(1)
  @Max(6)
  dayOfWeek!: number

  @IsInt()
  @Min(1)
  @Max(8)
  slotNumber!: number

  @IsEnum(WeekParity)
  weekParity!: WeekParity

  @IsEnum(LessonType)
  lessonType!: LessonType

  @IsOptional()
  @ValidateIf((o: CreateScheduleEntryDto) => o.subgroupNumber !== null)
  @IsInt()
  @Min(1)
  subgroupNumber?: number | null

  @IsUUID('4')
  curriculumComponentTermId!: string

  @IsOptional()
  @ValidateIf((o: CreateScheduleEntryDto) => o.teacherId !== null)
  @IsUUID('4')
  teacherId?: string | null

  @IsOptional()
  @ValidateIf((o: CreateScheduleEntryDto) => o.classroomId !== null)
  @IsUUID('4')
  classroomId?: string | null

  @IsOptional()
  @ValidateIf((o: CreateScheduleEntryDto) => o.onlineUrl != null && o.onlineUrl !== '')
  @IsUrl({ require_tld: false }, { message: 'onlineUrl має бути валідним посиланням.' })
  onlineUrl?: string | null
}

export class SwapScheduleEntriesDto {
  @IsUUID('4')
  entryAId!: string

  @IsUUID('4')
  entryBId!: string
}

export class UpdateScheduleEntryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  dayOfWeek?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  slotNumber?: number

  @IsOptional()
  @IsEnum(WeekParity)
  weekParity?: WeekParity

  @IsOptional()
  @IsEnum(LessonType)
  lessonType?: LessonType

  @IsOptional()
  @ValidateIf((o: UpdateScheduleEntryDto) => o.subgroupNumber !== null)
  @IsInt()
  @Min(1)
  subgroupNumber?: number | null

  @IsOptional()
  @ValidateIf((o: UpdateScheduleEntryDto) => o.teacherId !== null)
  @IsUUID('4')
  teacherId?: string | null

  @IsOptional()
  @ValidateIf((o: UpdateScheduleEntryDto) => o.classroomId !== null)
  @IsUUID('4')
  classroomId?: string | null

  @IsOptional()
  @ValidateIf((o: UpdateScheduleEntryDto) => o.onlineUrl != null && o.onlineUrl !== '')
  @IsUrl({ require_tld: false }, { message: 'onlineUrl має бути валідним посиланням.' })
  onlineUrl?: string | null
}

// ─── Settings (ТЗ §3.4 — Адміністратор системи) ───────────────────────────────

export class ScheduleSettingsDto {
  maxPairsFullTime!: number
  maxPairsPartTime!: number | null
  homeroomCountsToLimit!: boolean
}

export class UpdateScheduleSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  maxPairsFullTime?: number

  @IsOptional()
  @ValidateIf((o: UpdateScheduleSettingsDto) => o.maxPairsPartTime !== null)
  @IsInt()
  @Min(1)
  @Max(12)
  maxPairsPartTime?: number | null

  @IsOptional()
  @IsBoolean()
  homeroomCountsToLimit?: boolean
}

// ─── Homeroom (ТЗ §3.5) ───────────────────────────────────────────────────────

export class SetHomeroomDto {
  @IsUUID('4')
  groupId!: string

  @IsString()
  academicYear!: string

  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number

  /** День тижня (1=Пн..5=Пт) або null, щоб прибрати виховну годину. */
  @ValidateIf((o: SetHomeroomDto) => o.dayOfWeek !== null)
  @IsInt()
  @Min(1)
  @Max(5)
  dayOfWeek!: number | null
}

// ─── Copy + mass operations (ТЗ §3.8) ─────────────────────────────────────────

export class CopyScheduleDto {
  /** Джерело: розклад, який копіюємо як шаблон. */
  @IsUUID('4')
  fromScheduleId!: string

  /** Призначення (група × рік × семестр). */
  @IsUUID('4')
  toGroupId!: string

  @IsString()
  toAcademicYear!: string

  @IsInt()
  @Min(1)
  @Max(12)
  toSemesterNumber!: number

  /** Перезаписати існуючі заняття призначення (інакше — помилка, якщо не порожній). */
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean
}

/** Масова заміна викладача/аудиторії для набору занять (ТЗ §3.8). */
export class MassReplaceDto {
  @IsArray()
  @IsUUID('4', { each: true })
  entryIds!: string[]

  @IsOptional()
  @ValidateIf((o: MassReplaceDto) => o.teacherId !== undefined)
  @IsUUID('4')
  teacherId?: string | null

  @IsOptional()
  @ValidateIf((o: MassReplaceDto) => o.classroomId !== undefined)
  @IsUUID('4')
  classroomId?: string | null
}

// ─── Substitutions (ТЗ §3.8, §7.3) ────────────────────────────────────────────

export class CreateSubstitutionDto {
  @IsUUID('4')
  entryId!: string

  @IsISO8601()
  date!: string

  @IsEnum(SubstitutionType)
  type!: SubstitutionType

  @IsOptional()
  @ValidateIf((o: CreateSubstitutionDto) => o.newDayOfWeek != null)
  @IsInt()
  @Min(1)
  @Max(5)
  newDayOfWeek?: number | null

  @IsOptional()
  @ValidateIf((o: CreateSubstitutionDto) => o.newSlotNumber != null)
  @IsInt()
  @Min(1)
  @Max(8)
  newSlotNumber?: number | null

  @IsOptional()
  @ValidateIf((o: CreateSubstitutionDto) => o.replacementTeacherId != null)
  @IsUUID('4')
  replacementTeacherId?: string | null

  @IsOptional()
  @ValidateIf((o: CreateSubstitutionDto) => o.replacementClassroomId != null)
  @IsUUID('4')
  replacementClassroomId?: string | null

  @IsOptional()
  @IsString()
  reason?: string | null
}

// ─── Teacher / classroom views (ТЗ §3.10) ─────────────────────────────────────

/** Один запис у перегляді розкладу викладача/аудиторії (з прив'язкою до групи). */
export class CrossScheduleEntryDto extends ScheduleEntryDto {
  groupId!: string
  groupName!: string
}

export class ClassroomRefWithMetaDto {
  id!: string
  number!: string
  name!: string
  capacity!: number | null
  type!: ClassroomType | null
}
