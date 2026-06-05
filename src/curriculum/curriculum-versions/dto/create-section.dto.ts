import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CurriculumSectionType } from '@prisma/client'
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class CreateSectionDto {
  @ApiPropertyOptional({ description: 'Код розділу', example: 'ЦФП' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string

  @ApiProperty({ description: 'Назва розділу', example: 'Цикл фахової підготовки' })
  @IsString()
  @MinLength(2)
  @MaxLength(512)
  name!: string

  @ApiProperty({ description: 'Порядок виведення', example: 1 })
  @IsInt()
  @Min(0)
  orderIndex!: number

  @ApiProperty({ enum: CurriculumSectionType, description: 'Тип розділу' })
  @IsEnum(CurriculumSectionType, { message: 'Невалідний тип розділу.' })
  sectionType!: CurriculumSectionType

  @ApiPropertyOptional({ description: 'Підсумок ЄКТС розділу', example: 111.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotalEcts?: number
}
