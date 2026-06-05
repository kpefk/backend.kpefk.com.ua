import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCurriculumVersionDto {
  @ApiProperty({ description: 'Дата затвердження плану', example: '2025-05-26' })
  @IsDateString({}, { message: 'approvalDate має бути валідною датою (ISO 8601).' })
  approvalDate!: string

  @ApiProperty({ description: 'Номер наказу про затвердження', example: '№6 від 26.05.2025' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  approvalOrderNumber!: string

  @ApiProperty({ description: 'Затверджено ким', example: 'Директор Т. Селівончик' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  approvedBy!: string

  @ApiPropertyOptional({ description: 'Примітки до версії' })
  @IsOptional()
  @IsString()
  notes?: string
}
