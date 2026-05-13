import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UniversityExamRequestListParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;

  @ApiPropertyOptional({ description: 'Фільтр: потік вступників' })
  @IsInt()
  @IsOptional()
  universityExamStreamId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: чи подано з електронного кабінету вступника' })
  @IsBoolean()
  @IsOptional()
  isEz?: boolean;

  @ApiPropertyOptional({ description: 'Фільтр: статус заяви' })
  @IsInt()
  @IsOptional()
  examRequestStatusId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: код фіз.особи' })
  @IsInt()
  @IsOptional()
  personId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: ПІБ вступника (за підстрокою)' })
  @IsString()
  @IsOptional()
  personPIB?: string;

  @ApiPropertyOptional({ description: 'Номер сторінки з даними (починаючи з 0)' })
  @IsInt()
  @IsOptional()
  pageNo?: number;

  @ApiPropertyOptional({ description: 'Розмір сторінки з даними (за замовчуванням 20)' })
  @IsInt()
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Поле для сортування' })
  @IsString()
  @IsOptional()
  sortField?: string;
}
