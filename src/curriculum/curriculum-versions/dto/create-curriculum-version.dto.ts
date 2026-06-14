import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateCurriculumVersionDto {
  // Метадані затвердження більше не вимагаються (плани заходять уже затвердженими).
  @ApiPropertyOptional({ description: 'Дата затвердження плану', example: '2025-05-26' })
  @IsOptional()
  @IsDateString({}, { message: 'approvalDate має бути валідною датою (ISO 8601).' })
  approvalDate?: string

  @ApiPropertyOptional({ description: 'Номер наказу про затвердження', example: '№6 від 26.05.2025' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  approvalOrderNumber?: string

  @ApiPropertyOptional({ description: 'Затверджено ким', example: 'Директор Т. Селівончик' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  approvedBy?: string

  @ApiPropertyOptional({ description: 'Примітки до версії' })
  @IsOptional()
  @IsString()
  notes?: string
}
