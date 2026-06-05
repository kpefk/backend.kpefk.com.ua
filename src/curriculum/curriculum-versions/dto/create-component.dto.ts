import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ComponentType, PracticeType } from '@prisma/client'
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

  @ApiProperty({ description: 'ЄКТС кредитів', example: 12.0 })
  @IsNumber()
  @Min(0)
  @Max(999)
  totalEcts!: number

  @ApiProperty({ description: 'Загальна кількість годин', example: 360 })
  @IsInt()
  @Min(0)
  totalHours!: number

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
}
