import { ApiProperty } from '@nestjs/swagger'
import { AdmissionBasis, EducationForm } from '@prisma/client'
import {
  IsEnum,
  IsInt,
  IsObject,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator'

import { ParsedCurriculum } from '../curriculum-import.types'

/**
 * Тіло запиту на фіксацію (commit) імпортованого навчального плану в БД.
 * `parsed` — структура з кроку preview (можливо, відредагована на фронті).
 * Метадані наказу про затвердження в Excel відсутні — їх задає адміністратор.
 */
export class ImportCommitDto {
  @ApiProperty({ description: 'ID освітньо-професійної програми (ОПП)' })
  @IsString()
  @IsNotEmpty()
  programId!: string

  @ApiProperty({ enum: EducationForm, description: 'Форма навчання' })
  @IsEnum(EducationForm)
  educationForm!: EducationForm

  @ApiProperty({ enum: AdmissionBasis, description: 'Підстава для вступу' })
  @IsEnum(AdmissionBasis)
  admissionBasis!: AdmissionBasis

  @ApiProperty({ example: 2025, description: 'Рік вступу' })
  @IsInt()
  @Min(2000)
  entryYear!: number

  @ApiProperty({ example: 46, description: 'Тривалість навчання (місяців)' })
  @IsInt()
  @Min(1)
  studyDurationMonths!: number

  @ApiProperty({ description: 'Розпарсена структура плану (з кроку preview)' })
  @IsObject()
  parsed!: ParsedCurriculum
}
