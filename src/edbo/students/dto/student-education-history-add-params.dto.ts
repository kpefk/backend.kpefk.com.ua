import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class StudentEducationHistoryAddDto {
  // ── Обов'язкові поля ──────────────────────────────────────────────

  @ApiProperty({
    description: 'Код картки здобувача освіти',
    example: 456,
  })
  @IsInt()
  educationId!: number;

  @ApiProperty({
    description: 'Код статусу навчання',
    example: 1,
  })
  @IsInt()
  historyTypeId!: number;

  @ApiProperty({
    description: 'Дата "Діє з" статусу навчання',
    example: '2024-09-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  dateBegin!: Date;

  // ── Необов'язкові поля ────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      'Дата "Діє по" статусу навчання. ' +
      'Використовується для статусів надання та подовження академічних/декретних відпусток',
    example: '2025-02-28T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateEnd?: Date;

  @ApiPropertyOptional({
    description: 'Коментар до статусу історії навчання',
    example: 'Переведення на наступний курс',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Код основи вступу',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  baseQualificationId?: number;

  @ApiPropertyOptional({
    description: 'Ідентифікатор спеціальності',
    example: 121,
  })
  @IsOptional()
  @IsInt()
  specialityId?: number;

  @ApiPropertyOptional({
    description: 'Ідентифікатор спеціалізації закладу',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  universitySpecializationId?: number;

  @ApiPropertyOptional({
    description: 'Ідентифікатор освітньої програми',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  universityStudyProgramId?: number;

  @ApiPropertyOptional({
    description: 'Код форми здобуття освіти',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  educationFormId?: number;

  @ApiPropertyOptional({
    description: 'Код джерела фінансування',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  paymentTypeId?: number;

  @ApiPropertyOptional({
    description: 'Рік бюджету',
    example: 2024,
  })
  @IsOptional()
  @IsInt()
  budgetYear?: number;

  @ApiPropertyOptional({
    description: 'Чи регіональне замовлення',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRegionGovernanceOrder?: boolean;

  @ApiPropertyOptional({
    description: 'Чи контракт за кошти юридичної особи',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isLegalEntityPayment?: boolean;

  @ApiPropertyOptional({
    description: 'Ідентифікатор структурного підрозділу',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  facultyId?: number;

  @ApiPropertyOptional({
    description: 'Чи скорочений термін навчання',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isShortTerm?: boolean;

  @ApiPropertyOptional({ description: 'Ідентифікатор професії №1', example: 1 })
  @IsOptional()
  @IsInt()
  professionId1?: number;

  @ApiPropertyOptional({ description: 'Ідентифікатор професії №2', example: 1 })
  @IsOptional()
  @IsInt()
  professionId2?: number;

  @ApiPropertyOptional({ description: 'Ідентифікатор професії №3', example: 1 })
  @IsOptional()
  @IsInt()
  professionId3?: number;

  @ApiPropertyOptional({ description: 'Ідентифікатор професії №4', example: 1 })
  @IsOptional()
  @IsInt()
  professionId4?: number;

  @ApiPropertyOptional({ description: 'Ідентифікатор професії №5', example: 1 })
  @IsOptional()
  @IsInt()
  professionId5?: number;

  @ApiPropertyOptional({
    description: 'Код причини відрахування',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  cancelEducationTypeId?: number;

  @ApiPropertyOptional({
    description: 'Код причини академічної відпустки',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  academicLeaveTypeId?: number;
}
