import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UniversityExamListParamsDto {
  @ApiProperty({ description: 'Код закладу освіти' })
  @IsInt()
  universityId!: number;

  @ApiPropertyOptional({ description: 'Фільтр: ID форми випробування' })
  @IsInt()
  @IsOptional()
  examFormId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: ID предмету вступного випробування (з довідника)' })
  @IsInt()
  @IsOptional()
  subjectId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: ID спеціальності (для творчих конкурсів)' })
  @IsInt()
  @IsOptional()
  specialityId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: ID спеціалізації (для творчих конкурсів)' })
  @IsInt()
  @IsOptional()
  specializationId?: number;

  @ApiPropertyOptional({ description: 'Фільтр: Чи є подані активні заяви' })
  @IsBoolean()
  @IsOptional()
  hasRequests?: boolean;

  @ApiPropertyOptional({ description: 'Номер сторінки з даними (починаючи з 0)' })
  @IsInt()
  @IsOptional()
  pageNo?: number;

  @ApiPropertyOptional({ description: 'Розмір сторінки з даними (за замовчуванням 20)' })
  @IsInt()
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Поле для сортування з суфіксом " DESC" для зворотнього напрямку' })
  @IsString()
  @IsOptional()
  sortField?: string;
}
