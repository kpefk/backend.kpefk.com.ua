import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class StudentEducationsListForExternalRequestDto {
  // ── Обов'язкові поля ──────────────────────────────────────────────

  @ApiProperty({
    description:
      'Номер сторінки результатів (починається з 0). ' +
      'Повертає по 1000 записів на сторінку',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  pageNo!: number;

  // ── Необов'язкові фільтри ─────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Фільтр: код картки здобувача в ЄДЕБО', example: 456 })
  @IsOptional()
  @IsInt()
  educationId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: РНОКПП здобувача', example: '1234567890' })
  @IsOptional()
  @IsString()
  rnokpp?: string;

  @ApiPropertyOptional({ description: 'Фільтр: код закладу освіти в ЄДЕБО', example: 1 })
  @IsOptional()
  @IsInt()
  universityId?: number;

  @ApiPropertyOptional({
    description: `Фільтр: освітній ступінь:
1 — Бакалавр, 2 — Магістр, 3 — Спеціаліст, 4 — Молодший спеціаліст,
5 — Кваліфікований робітник, 6 — Молодший бакалавр, 7 — Доктор філософії,
8 — Доктор наук, 9 — Фаховий молодший бакалавр, 10 — Доктор мистецтва`,
    example: 1,
    enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  })
  @IsOptional()
  @IsInt()
  qualificationGroupId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: чи активний статус навчання', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Фільтр: повернути лише картки, змінені після вказаної дати',
    example: '2024-01-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;
}
