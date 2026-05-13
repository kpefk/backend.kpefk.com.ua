import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CancellationListParamsDto {
  @ApiProperty({ description: 'Код закладу освіти', example: 1 })
  @IsInt()
  universityId!: number;

  @ApiPropertyOptional({
    description: 'Номер сторінки (починаючи з 0)',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  pageNo?: number;

  @ApiPropertyOptional({
    description: 'Розмір сторінки (за замовчуванням 20)',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Поле сортування. Суфікс " DESC" для зворотного напрямку',
    example: 'dateCreate DESC',
  })
  @IsOptional()
  @IsString()
  sortField?: string;
}
