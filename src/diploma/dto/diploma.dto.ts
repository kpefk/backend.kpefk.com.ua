import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

import {
  DiplomaComponentType,
  DiplomaGrade,
  DiplomaStatus,
  DiplomaVariant,
  TermControlForm,
} from '@prisma/client'

// ─── Import ───────────────────────────────────────────────────────────────────

export class ImportCommitDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  academicYear?: string
}

// ─── Diploma update ───────────────────────────────────────────────────────────

export class UpdateDiplomaDto {
  @IsOptional()
  @ValidateIf((o: UpdateDiplomaDto) => o.templateId !== null)
  @IsUUID('4')
  templateId?: string | null

  @IsOptional()
  @IsString()
  qualificationWorkTitleUk?: string | null

  @IsOptional()
  @IsString()
  qualificationWorkTitleEn?: string | null

  @IsOptional()
  @IsBoolean()
  isHonors?: boolean

  @IsOptional()
  @IsEnum(DiplomaStatus)
  status?: DiplomaStatus
}

export class AssignTemplateDto {
  @IsOptional()
  @ValidateIf((o: AssignTemplateDto) => o.templateId !== null)
  @IsUUID('4')
  templateId!: string | null

  @IsOptional()
  @IsBoolean()
  applyToGroup?: boolean
}

class GradeItemDto {
  @IsUUID('4')
  componentId!: string

  @IsOptional()
  @ValidateIf((o: GradeItemDto) => o.grade !== null)
  @IsEnum(DiplomaGrade)
  grade?: DiplomaGrade | null
}

export class SetGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeItemDto)
  grades!: GradeItemDto[]
}

// ─── Templates ────────────────────────────────────────────────────────────────

export class CreateTemplateDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  specialtyCode?: string

  @IsOptional()
  @IsString()
  specialtyName?: string

  @IsEnum(DiplomaVariant)
  variant!: DiplomaVariant
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  specialtyCode?: string

  @IsOptional()
  @IsString()
  specialtyName?: string

  @IsOptional()
  @IsEnum(DiplomaVariant)
  variant?: DiplomaVariant

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  accrCertNumber?: string | null

  @IsOptional()
  @IsString()
  accrCertSeries?: string | null

  @IsOptional()
  @IsString()
  accrCertEndDate?: string | null

  @IsOptional()
  @IsString()
  accrInstitutionName?: string | null

  @IsOptional()
  @IsString()
  accrInstitutionNameEn?: string | null
}

class TemplateComponentDto {
  @IsOptional()
  @IsString()
  code?: string | null

  @IsString()
  nameUk!: string

  @IsOptional()
  @IsString()
  nameEn?: string | null

  @IsOptional()
  @ValidateIf((o: TemplateComponentDto) => o.ects !== null)
  @IsNumber()
  @Min(0)
  ects?: number | null

  @IsEnum(DiplomaComponentType)
  type!: DiplomaComponentType

  @IsOptional()
  @ValidateIf((o: TemplateComponentDto) => o.controlForm !== null)
  @IsEnum(TermControlForm)
  controlForm?: TermControlForm | null

  @IsInt()
  @Min(0)
  orderIndex!: number
}

export class SetTemplateComponentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components!: TemplateComponentDto[]
}

export class ApplyBatchTemplateDto {
  @IsOptional()
  @ValidateIf((o: ApplyBatchTemplateDto) => o.templateId !== null)
  @IsUUID('4')
  templateId?: string | null

  /** Якщо задано — застосувати лише до дипломів цієї академічної групи. */
  @IsOptional()
  @IsString()
  groupName?: string
}
