import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

/** Дозволяємо змінювати лише операційні поля (не ключові поля ідентичності). */
export class UpdateCurriculumDto {
  @ApiPropertyOptional({ description: 'Тривалість навчання в місяцях' })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(72)
  studyDurationMonths?: number

  @ApiPropertyOptional({ description: 'Загальний обсяг ЄКТС' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(999)
  totalEcts?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
