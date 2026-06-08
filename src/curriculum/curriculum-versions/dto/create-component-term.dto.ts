import { ApiPropertyOptional } from '@nestjs/swagger'
import { TermControlForm } from '@prisma/client'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
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
}
