import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ControlForm } from '@prisma/client'
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
  @ApiProperty({ description: 'Номер семестру', example: 3 })
  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number

  @ApiProperty({ description: 'ЄКТС за семестр', example: 4.5 })
  @IsNumber()
  @Min(0)
  @Max(30)
  ects!: number

  @ApiProperty({ description: 'Годин за семестр', example: 135 })
  @IsInt()
  @Min(0)
  hours!: number

  @ApiProperty({ enum: ControlForm, description: 'Форма підсумкового контролю' })
  @IsEnum(ControlForm, { message: 'Невалідна форма контролю.' })
  controlForm!: ControlForm

  @ApiPropertyOptional({ description: 'Наявність курсової роботи', default: false })
  @IsOptional()
  @IsBoolean()
  hasCourseWork?: boolean

  @ApiPropertyOptional({ description: 'Наявність курсового проекту', default: false })
  @IsOptional()
  @IsBoolean()
  hasCourseProject?: boolean
}
