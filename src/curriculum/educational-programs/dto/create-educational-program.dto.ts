import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class CreateEducationalProgramDto {
  @ApiProperty({ description: 'UUID спеціальності', example: 'uuid' })
  @IsUUID('4', { message: 'specialtyId має бути валідним UUID.' })
  specialtyId!: string

  @ApiProperty({ description: 'Назва програми', example: "Комп'ютерні науки" })
  @IsString({ message: 'Назва має бути рядком.' })
  @MinLength(2)
  @MaxLength(255)
  name!: string

  @ApiProperty({
    description: 'Кваліфікація в дипломі',
    example: "Фаховий молодший бакалавр з комп'ютерних наук",
  })
  @IsString({ message: 'qualificationName має бути рядком.' })
  @MinLength(2)
  @MaxLength(512)
  qualificationName!: string

  @ApiPropertyOptional({
    description: 'Освітньо-кваліфікаційний рівень',
    example: 'Фаховий молодший бакалавр',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  qualificationLevel?: string

  @ApiPropertyOptional({ description: 'ID програми в ЄДЕБО (universityStudyProgramId)' })
  @IsOptional()
  @IsInt({ message: 'edeboId має бути цілим числом.' })
  @Min(1)
  edeboId?: number

  @ApiPropertyOptional({ description: 'Дата затвердження ОПП', example: '2024-05-20' })
  @IsOptional()
  @IsDateString({}, { message: 'approvalDate має бути валідною датою (ISO 8601).' })
  approvalDate?: string

  @ApiPropertyOptional({ description: 'Номер наказу про затвердження' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  approvalOrderNumber?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
