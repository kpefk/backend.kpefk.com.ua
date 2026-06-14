import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator'

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
}
