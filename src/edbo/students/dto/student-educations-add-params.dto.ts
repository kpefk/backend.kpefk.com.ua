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
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class StudentEducationsAddParamsDto {
  // ── Обов'язкові поля ──────────────────────────────────────────────

  @ApiProperty({ description: 'Код закладу освіти', example: 1 })
  @IsInt()
  universityId!: number;

  @ApiProperty({ description: 'Код статусу навчання', example: 1 })
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

  @ApiProperty({ description: 'Код фізичної особи', example: 123 })
  @IsInt()
  personId!: number;

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

  @ApiProperty({
    description: `Код освітнього ступеня:
1 — Бакалавр, 2 — Магістр, 3 — Спеціаліст, 4 — Молодший спеціаліст,
5 — Кваліфікований робітник, 6 — Молодший бакалавр, 7 — Доктор філософії,
8 — Доктор наук, 9 — Фаховий молодший бакалавр, 10 — Доктор мистецтва`,
    example: 1,
    enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  })
  @IsInt()
  qualificationGroupId!: number;

  @ApiProperty({ description: 'Код вступу на основі', example: 1 })
  @IsInt()
  baseQualificationId!: number;

  @ApiProperty({ description: 'Код форми навчання', example: 1 })
  @IsInt()
  educationFormId!: number;

  @ApiProperty({ description: 'Код джерела фінансування', example: 1 })
  @IsInt()
  paymentTypeId!: number;

  @ApiProperty({ description: 'Чи скорочений термін підготовки', example: false })
  @IsBoolean()
  isShortTerm!: boolean;

  @ApiProperty({ description: 'Здобуття освіти за іншою спеціальністю', example: false })
  @IsBoolean()
  isSecondHigher!: boolean;

  @ApiProperty({ description: 'Код курсу', example: 1 })
  @IsInt()
  courseId!: number;

  // ── Необов'язкові поля ────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      "Код документу вступу. Обов'язковий для всіх статусів, окрім статусу 25 (декларація)",
    example: 1,
  })
  @ValidateIf((o) => o.historyTypeId !== 25)
  @IsOptional()
  @IsInt()
  documentEducationId?: number;

  @ApiPropertyOptional({
    description: 'Код ЗО, звідки переведено або поновлено здобувача',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  universityIdFrom?: number;

  @ApiPropertyOptional({ description: 'Код попереднього навчання', example: 10 })
  @IsOptional()
  @IsInt()
  previousEducationId?: number;

  @ApiPropertyOptional({
    description: 'Код академічної довідки при переведенні/поновленні',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  documentAcademId?: number;

  @ApiPropertyOptional({ description: 'КР без отримання ПЗСО', example: false })
  @IsOptional()
  @IsBoolean()
  isWithoutPzso?: boolean;

  @ApiPropertyOptional({ description: 'Дуальна форма навчання', example: false })
  @IsOptional()
  @IsBoolean()
  isDualForm?: boolean;

  @ApiPropertyOptional({ description: 'Рік бюджету', example: 2024 })
  @IsOptional()
  @IsInt()
  budgetYear?: number;

  @ApiPropertyOptional({ description: 'Чи регіональне замовлення', example: false })
  @IsOptional()
  @IsBoolean()
  isRegionGovernanceOrder?: boolean;

  @ApiPropertyOptional({ description: 'Чи контракт за кошти юридичної особи', example: false })
  @IsOptional()
  @IsBoolean()
  isLegalEntityPayment?: boolean;

  @ApiPropertyOptional({ description: 'Код спеціальності', example: 121 })
  @IsOptional()
  @IsInt()
  specialityId?: number;

  @ApiPropertyOptional({ description: 'Код спеціалізації закладу освіти', example: 1 })
  @IsOptional()
  @IsInt()
  universitySpecializationId?: number;

  @ApiPropertyOptional({ description: 'Код освітньої програми', example: 1 })
  @IsOptional()
  @IsInt()
  universityStudyProgramId?: number;

  @ApiPropertyOptional({ description: 'Код структурного підрозділу', example: 1 })
  @IsOptional()
  @IsInt()
  facultyId?: number;

  @ApiPropertyOptional({ description: 'Навчальна група', example: 'ІС-41' })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional({ description: 'Коментар', example: 'Переведення з іншого ЗО' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Опис освітньої декларації',
    example: 'Декларація №123',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  declarationDocName?: string;

  @ApiPropertyOptional({
    description: 'Дата видачі освітньої декларації',
    example: '2024-09-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  declarationDocDate?: Date;

  @ApiPropertyOptional({ description: 'Код типу іноземця', example: 1 })
  @IsOptional()
  @IsInt()
  foreignTypeId?: number;

  @ApiPropertyOptional({ description: 'Код категорії переведення на бюджет', example: 1 })
  @IsOptional()
  @IsInt()
  budgetTransferCategoryId?: number;

  @ApiPropertyOptional({
    description: 'Конкурсний бал при вступі',
    example: 185.5,
    minimum: 0,
    maximum: 999999,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  konkursValue?: number;

  @ApiPropertyOptional({ description: 'Код професії 1', example: 1 })
  @IsOptional()
  @IsInt()
  professionId1?: number;

  @ApiPropertyOptional({ description: 'Код професії 2', example: 1 })
  @IsOptional()
  @IsInt()
  professionId2?: number;

  @ApiPropertyOptional({ description: 'Код професії 3', example: 1 })
  @IsOptional()
  @IsInt()
  professionId3?: number;

  @ApiPropertyOptional({ description: 'Код професії 4', example: 1 })
  @IsOptional()
  @IsInt()
  professionId4?: number;

  @ApiPropertyOptional({ description: 'Код професії 5', example: 1 })
  @IsOptional()
  @IsInt()
  professionId5?: number;

  // ── Компенсація за попереднє навчання ─────────────────────────────

  @ApiPropertyOptional({
    description: 'Код картки здобувача, за якою треба внести компенсацію',
    example: 789,
  })
  @IsOptional()
  @IsInt()
  oweEducationId?: number;

  @ApiPropertyOptional({
    description: 'Дата, до якої треба компенсувати. Ігнорується якщо oweEducationId = null',
    example: '2025-01-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @ValidateIf((o) => o.oweEducationId != null)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  compensationDate?: Date;

  @ApiPropertyOptional({
    description: 'Сума компенсації. Ігнорується якщо oweEducationId = null',
    example: 15000,
  })
  @ValidateIf((o) => o.oweEducationId != null)
  @IsOptional()
  @IsInt()
  debtAmount?: number;

  @ApiPropertyOptional({
    description: 'Чи компенсував. Ігнорується якщо oweEducationId = null',
    example: false,
  })
  @ValidateIf((o) => o.oweEducationId != null)
  @IsOptional()
  @IsBoolean()
  isCompensated?: boolean;

  @ApiPropertyOptional({
    description: 'Підстава звільнення від компенсації. Ігнорується якщо oweEducationId = null',
    example: 'Звільнений від компенсації згідно наказу №5',
  })
  @ValidateIf((o) => o.oweEducationId != null)
  @IsOptional()
  @IsString()
  noNeedCompensationReason?: string;
}
