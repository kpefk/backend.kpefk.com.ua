import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class UpsertWorkingComponentTermDto {
  @ApiProperty({ description: 'UUID розподілу компонента (CurriculumComponentTerm)', example: 'uuid' })
  @IsUUID('4', { message: 'componentTermId має бути валідним UUID.' })
  componentTermId!: string

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
  weeklyLectureHours?: number

  @ApiPropertyOptional({ description: 'Тижневе навантаження (практика)', example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyPracticalHours?: number
}
