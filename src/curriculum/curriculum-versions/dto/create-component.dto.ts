import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ComponentType, CurriculumComponentType, PracticeType } from '@prisma/client'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class CreateComponentDto {
  @ApiPropertyOptional({ description: 'UUID блоку вибіркових компонентів' })
  @IsOptional()
  @IsUUID('4')
  electiveBlockId?: string

  @ApiPropertyOptional({ description: 'Код компонента', example: 'ОК12' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string

  @ApiProperty({ description: 'Назва компонента', example: 'Алгоритмізація та програмування' })
  @IsString()
  @MinLength(2)
  @MaxLength(512)
  name!: string

  @ApiProperty({ enum: ComponentType })
  @IsEnum(ComponentType, { message: 'Невалідний тип компонента.' })
  componentType!: ComponentType

  @ApiPropertyOptional({
    enum: CurriculumComponentType,
    description: 'Укрупнена категорія компонента',
    default: CurriculumComponentType.REGULAR,
  })
  @IsOptional()
  @IsEnum(CurriculumComponentType, { message: 'Невалідна категорія компонента.' })
  componentKind?: CurriculumComponentType

  @ApiProperty({ description: 'ЄКТС кредитів', example: 12.0 })
  @IsNumber()
  @Min(0)
  @Max(999)
  totalEcts!: number

  @ApiPropertyOptional({ description: 'Загальна кількість годин (розраховується як totalEcts × 30 якщо не передано)', example: 360 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalHours?: number

  @ApiProperty({ description: 'Порядок виведення', example: 1 })
  @IsInt()
  @Min(0)
  orderIndex!: number

  @ApiPropertyOptional({ description: "Чи обов'язковий компонент", default: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean

  @ApiPropertyOptional({ enum: PracticeType, description: 'Вид практики (для типу PRACTICE)' })
  @IsOptional()
  @IsEnum(PracticeType)
  practiceType?: PracticeType

  @ApiPropertyOptional({ description: 'Кількість курсових робіт', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  courseWorkCount?: number

  @ApiPropertyOptional({ description: 'Кількість курсових проектів', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  courseProjectCount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  // ── Розподіл годин ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Аудиторні години (загалом)', example: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  auditoryHours?: number

  @ApiPropertyOptional({ description: 'Лекційні години', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lectureHours?: number

  @ApiPropertyOptional({ description: 'Практичні заняття (год.)', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  practicalHours?: number

  @ApiPropertyOptional({ description: 'Семінарські заняття (год.)', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  seminarHours?: number

  @ApiPropertyOptional({ description: 'Лабораторні роботи (год.)', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  labHours?: number

  @ApiPropertyOptional({ description: 'Самостійна робота (год.)', example: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  selfStudyHours?: number

  @ApiPropertyOptional({ description: 'Інші години (консультації тощо)', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  otherHours?: number

  @ApiPropertyOptional({
    description: 'Підготовка до ЗНО (тільки для блоку ЗСО)',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  znoPreparationHours?: number

  // ── Вибіркова група ────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код вибіркової групи', example: 'ВК1' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  groupCode?: string

  @ApiPropertyOptional({ description: 'UUID батьківського компонента (для альтернатив)' })
  @IsOptional()
  @IsUUID('4')
  parentComponentId?: string
}
