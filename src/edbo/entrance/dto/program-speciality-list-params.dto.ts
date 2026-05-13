import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class ProgramSpecialityListParamsDto {
  @ApiProperty({ description: 'Ідентифікатор конкурсної пропозиції' })
  @IsInt()
  universitySpecialitiesId!: number;

  @ApiPropertyOptional({ description: 'Номер сторінки з даними (починаючи з 0).              Якщо параметр не вказаний, він вважається рівним 0' })
  @IsInt()
  @IsOptional()
  pageNo?: number;

  @ApiPropertyOptional({ description: 'Розмір сторінки з даними (максимальна кількість записів, що може вернути метод)             Якщо параметр не вказаний, він вважається рівним 20' })
  @IsInt()
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Поле для сортування з суфіксом « DESC» для зворотнього напрямку' })
  @IsString()
  @IsOptional()
  sortField?: string;

}
