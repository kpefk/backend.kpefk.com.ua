import { ApiPropertyOptional } from '@nestjs/swagger'
import { TermControlForm } from '@prisma/client'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateComponentTermDto {
  @ApiPropertyOptional({ description: 'Номер семестру', example: 3 })
  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number

  @ApiPropertyOptional({ description: 'ЄКТС за семестр (необовʼязково; якщо не передано — зберігається 0)', example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  ects?: number

  @ApiPropertyOptional({ description: 'Годин за семестр', example: 135 })
  @IsInt()
  @Min(0)
  hours!: number

  @ApiPropertyOptional({
    description: 'Годин на тиждень (знаменник у "34/2")',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  hoursPerWeek?: number

  @ApiPropertyOptional({
    enum: TermControlForm,
    description: 'Форма підсумкового контролю (null = не вказано)',
  })
  @IsOptional()
  @IsEnum(TermControlForm, { message: 'Невалідна форма контролю.' })
  controlForm?: TermControlForm

  @ApiPropertyOptional({ description: 'Наявність курсової роботи', default: false })
  @IsOptional()
  @IsBoolean()
  hasCourseWork?: boolean

  @ApiPropertyOptional({ description: 'Наявність курсового проекту', default: false })
  @IsOptional()
  @IsBoolean()
  hasCourseProject?: boolean

  /**
   * Кількість підгруп для практичних / лабораторних занять.
   * Наказ МОН №686 п.5–6: максимум 2 підгрупи; мінімум 10 студентів у кожній.
   * 1 = без поділу (за замовчуванням).
   */
  @ApiPropertyOptional({
    description: 'Кількість підгруп для практ./лаб. (1 або 2). Наказ МОН №686 п.5–6.',
    example: 2,
    minimum: 1,
    maximum: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2, { message: 'Наказ МОН №686 п.5–6 дозволяє поділ лише на 2 підгрупи.' })
  subgroupCount?: number

  /**
   * Текстова підстава для поділу на підгрупи (наприклад «Вимоги техніки безпеки» або «Наказ №12»).
   * Обовʼязкова для документального підтвердження при subgroupCount = 2.
   */
  @ApiPropertyOptional({
    description: 'Підстава для поділу на підгрупи (обов\'язкова при subgroupCount = 2)',
    example: 'Вимоги техніки безпеки в лабораторії',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subgroupJustification?: string
}
