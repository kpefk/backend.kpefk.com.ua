import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator'

export class CreateWorkingCurriculumDto {
  @ApiProperty({ description: 'UUID версії навчального плану', example: 'uuid' })
  @IsUUID('4', { message: 'versionId має бути валідним UUID.' })
  versionId!: string

  @ApiProperty({
    description: 'Навчальний рік у форматі "РРРР-РРРР"',
    example: '2024-2025',
  })
  @IsString()
  @Matches(/^\d{4}-\d{4}$/, { message: 'academicYear має бути у форматі "2024-2025".' })
  academicYear!: string

  @ApiProperty({
    description: 'Масив номерів семестрів, що охоплює цей робочий план',
    example: [3, 4],
  })
  @IsArray({ message: 'semesterNumbers має бути масивом.' })
  @ArrayMinSize(1, { message: 'Потрібно вказати хоча б один семестр.' })
  @IsInt({ each: true, message: 'Кожен номер семестру має бути цілим числом.' })
  @Min(1, { each: true })
  @Max(12, { each: true })
  semesterNumbers!: number[]

  @ApiPropertyOptional({ description: 'Примітки' })
  @IsOptional()
  @IsString()
  notes?: string
}
