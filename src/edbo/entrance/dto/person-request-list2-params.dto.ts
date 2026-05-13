import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class PersonRequestList2ParamsDto {
  @ApiProperty({ description: 'Код конкурсної пропозиції' })
  @IsString()
  universitySpecialitiesId!: string;

  @ApiPropertyOptional({ description: 'Код фізичної особи' })
  @IsString()
  @IsOptional()
  personId?: string;

  @ApiPropertyOptional({ description: 'Номер сторінки' })
  @IsInt()
  @IsOptional()
  p_PageNo?: number;

  @ApiPropertyOptional({ description: 'Кількість записів на сторінку' })
  @IsInt()
  @IsOptional()
  p_PageSize?: number;

  @ApiPropertyOptional({ description: 'Перелік статусів заяв. Для отримання заяв з усіма статусами передайте пустий масив []' })
  @IsString()
  @IsOptional()
  statusesList?: string;

}
