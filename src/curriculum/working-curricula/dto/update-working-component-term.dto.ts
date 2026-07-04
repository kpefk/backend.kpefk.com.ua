import { ApiPropertyOptional } from '@nestjs/swagger'
import { ExamFormat } from '@prisma/client'
import { IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class UpdateWorkingComponentTermDto {
  @ApiPropertyOptional({ description: 'Лекційні години', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lectureHours?: number

  @ApiPropertyOptional({ description: 'Практичні години', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  practicalHours?: number

  @ApiPropertyOptional({ description: 'Лабораторні години', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  labHours?: number

  @ApiPropertyOptional({ description: 'Семінарські години', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  seminarHours?: number

  @ApiPropertyOptional({ description: 'Самостійна робота (години)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  independentHours?: number

  @ApiPropertyOptional({ description: 'Консультаційні години', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  consultationHours?: number

  @ApiPropertyOptional({ description: 'Тижневе навантаження (лекції)', example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99.9)
  weeklyLectureHours?: number | null

  @ApiPropertyOptional({ description: 'Тижневе навантаження (практика)', example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99.9)
  weeklyPracticalHours?: number | null

  @ApiPropertyOptional({
    description: 'UUID викладача, відповідального за цей компонент у цьому семестрі. null — зняти призначення.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'teacherId має бути валідним UUID.' })
  teacherId?: string | null

  @ApiPropertyOptional({
    description: 'Формат семестрового екзамену (Наказ МОН №686, п.16). Лише для controlForm=EXAM.',
    enum: ExamFormat,
  })
  @IsOptional()
  @IsEnum(ExamFormat)
  examFormat?: ExamFormat | null

  @ApiPropertyOptional({
    description: 'Кількість контрольних робіт під час аудиторних занять (п.11)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  controlWorksAuditoryCount?: number

  @ApiPropertyOptional({
    description: 'Кількість контрольних робіт під час самостійної роботи (п.12)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  controlWorksIndependentCount?: number

  @ApiPropertyOptional({
    description: 'Тривалість практики в тижнях (Наказ МОН №686, п.17/18). Лише для componentType=PRACTICE.',
    example: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99.9)
  practiceDurationWeeks?: number | null

  @ApiPropertyOptional({
    description:
      'Кількість членів комісії захисту дипломних робіт (Наказ МОН №686, п.20). ' +
      'Лише для componentType IN (DIPLOMA_PROJECT, QUALIFICATION_WORK_DEFENSE).',
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  diplomaCommitteeSize?: number
}
