import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreateTimeBudgetEntryDto {
  @ApiProperty({ description: 'Рядок бюджету', example: 'Аудиторних годин' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  label!: string

  @ApiProperty({ description: 'Загальна кількість годин', example: 2865 })
  @IsInt()
  @Min(0)
  totalHours!: number

  @ApiPropertyOptional({ description: 'ЄКТС (якщо є)', example: 161 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalEcts?: number

  @ApiProperty({ description: 'Порядок виведення', example: 1 })
  @IsInt()
  @Min(0)
  orderIndex!: number
}
