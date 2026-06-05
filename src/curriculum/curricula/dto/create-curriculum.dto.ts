import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AdmissionBasis, EducationForm } from '@prisma/client'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator'

export class CreateCurriculumDto {
  @ApiProperty({ description: 'UUID освітньої програми (ОПП)', example: 'uuid' })
  @IsUUID('4', { message: 'programId має бути валідним UUID.' })
  programId!: string

  @ApiProperty({ enum: EducationForm, description: 'Форма навчання' })
  @IsEnum(EducationForm, { message: 'Невалідна форма навчання.' })
  educationForm!: EducationForm

  @ApiProperty({ enum: AdmissionBasis, description: 'Підстава для вступу' })
  @IsEnum(AdmissionBasis, { message: 'Невалідна підстава вступу.' })
  admissionBasis!: AdmissionBasis

  @ApiProperty({ description: 'Рік вступу', example: 2025 })
  @IsInt({ message: 'entryYear має бути цілим числом.' })
  @Min(2000)
  @Max(2100)
  entryYear!: number

  @ApiProperty({ description: 'Тривалість навчання в місяцях', example: 46 })
  @IsInt({ message: 'studyDurationMonths має бути цілим числом.' })
  @Min(6)
  @Max(72)
  studyDurationMonths!: number

  @ApiProperty({ description: 'Загальний обсяг ЄКТС', example: 180 })
  @IsNumber({}, { message: 'totalEcts має бути числом.' })
  @Min(1)
  @Max(999)
  totalEcts!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
