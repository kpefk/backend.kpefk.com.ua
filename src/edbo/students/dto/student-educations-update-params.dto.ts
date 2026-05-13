import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class StudentEducationsUpdateRequestDto {
  // ── Обов'язкові поля ──────────────────────────────────────────────

  @ApiProperty({ description: 'Код картки здобувача освіти', example: 456 })
  @IsInt()
  educationId!: number;

  @ApiProperty({
    description: 'Дата початку навчання',
    example: '2024-09-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  educationDateBegin!: Date;

  @ApiProperty({
    description: 'Дата закінчення навчання',
    example: '2028-06-30T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  educationDateEnd!: Date;

  // ── Необов'язкові поля ────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Код попереднього навчання (null — не змінювати)',
    example: 10,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  previousEducationId?: number | null;

  @ApiPropertyOptional({
    description: 'Код ЗО, звідки переведено (null — не змінювати)',
    example: 2,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  universityIdFrom?: number | null;

  @ApiPropertyOptional({ description: 'Код документу вступу', example: 1 })
  @IsOptional()
  @IsInt()
  documentEducationId?: number;

  @ApiPropertyOptional({ description: 'Код академічної довідки', example: 5 })
  @IsOptional()
  @IsInt()
  documentAcademId?: number;

  @ApiPropertyOptional({
    description: 'Наступна контрольна дата',
    example: '2025-09-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextStepDate?: Date;

  @ApiPropertyOptional({ description: 'Дуальна форма навчання', example: false })
  @IsOptional()
  @IsBoolean()
  isDualForm?: boolean;

  @ApiPropertyOptional({ description: 'Код курсу', example: 1 })
  @IsOptional()
  @IsInt()
  courseId?: number;

  @ApiPropertyOptional({ description: 'Навчальна група', example: 'ІС-41' })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional({ description: 'Код типу іноземця', example: 1 })
  @IsOptional()
  @IsInt()
  foreignTypeId?: number;

  @ApiPropertyOptional({ description: 'Код категорії переведення на бюджет', example: 1 })
  @IsOptional()
  @IsInt()
  budgetTransferCategoryId?: number;

  @ApiPropertyOptional({
    description: 'Конкурсний бал',
    example: 185.5,
    minimum: 0,
    maximum: 999999,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  konkursValue?: number;

  @ApiPropertyOptional({ description: 'КР без отримання ПЗСО', example: false })
  @IsOptional()
  @IsBoolean()
  isWithoutPzso?: boolean;

  @ApiPropertyOptional({
    description: 'Для поновлення захисту дисертації (аспірантура)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isForPhdRenewal?: boolean;

  @ApiPropertyOptional({ description: 'Чи контракт за кошти юридичної особи', example: false })
  @IsOptional()
  @IsBoolean()
  isLegalEntityPayment?: boolean;
}
