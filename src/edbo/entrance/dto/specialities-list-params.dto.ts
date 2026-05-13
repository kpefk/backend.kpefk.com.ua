import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class SpecialitiesListParamsDto {
  @ApiProperty({ description: 'ID закладу освіти' })
  @IsInt()
  universityID!: number;

  @ApiPropertyOptional({ description: 'ID пропозиції (пошук)' })
  @IsInt()
  @IsOptional()
  universitySpecialitiesId?: number;

  @ApiPropertyOptional({ description: 'ID спеціальності (пошук)' })
  @IsInt()
  @IsOptional()
  specialityId?: number;

  @ApiPropertyOptional({ description: 'ID спеціалізації (пошук)' })
  @IsInt()
  @IsOptional()
  specializationId?: number;

  @ApiPropertyOptional({ description: 'ID форми навчання (пошук)' })
  @IsInt()
  @IsOptional()
  educationFormId?: number;

  @ApiPropertyOptional({ description: 'ID освітнього ступеню (пошук)' })
  @IsInt()
  @IsOptional()
  qualificationGroupId?: number;

  @ApiPropertyOptional({ description: 'ID вступ на основі (пошук)' })
  @IsInt()
  @IsOptional()
  educationBaseId?: number;

  @ApiPropertyOptional({ description: 'ID виду пропозації (пошук)' })
  @IsInt()
  @IsOptional()
  universitySpecialitiesTypeId?: number;

  @ApiPropertyOptional({ description: 'ID структурного підрозділу (пошук)' })
  @IsInt()
  @IsOptional()
  universityFacultetId?: number;

  @ApiPropertyOptional({ description: 'ID відбіркової/приймальної комісії (пошук)' })
  @IsInt()
  @IsOptional()
  entranceExaminationId?: number;

  @ApiPropertyOptional({ description: 'Рік ЛО (пошук)' })
  @IsInt()
  @IsOptional()
  educationDateEndYear?: number;

  @ApiPropertyOptional({ description: 'ID курсу зарахування (пошук)' })
  @IsInt()
  @IsOptional()
  courseId?: number;

  @ApiPropertyOptional({ description: 'Чи підтверджено внесення КП (пошук)' })
  @IsBoolean()
  @IsOptional()
  isApplied?: boolean;

  @ApiPropertyOptional({ description: 'Чи потребує підтвердження державним замовником (пошук)' })
  @IsBoolean()
  @IsOptional()
  needApprove?: boolean;

  @ApiPropertyOptional({ description: 'Результат перевірки на наявність виділених держзамовником обсягів (пошук)' })
  @IsInt()
  @IsOptional()
  orderBlockedTypeId?: number;

  @ApiPropertyOptional({ description: 'ID регіональне замовлення від (пошук)' })
  @IsInt()
  @IsOptional()
  regionGovernanceTypeId?: number;

  @ApiPropertyOptional({ description: 'Чи без широких обсягів (пошук)' })
  @IsBoolean()
  @IsOptional()
  noGlobalOrder?: boolean;

  @ApiPropertyOptional({ description: 'Чи без макс обсягів (пошук)' })
  @IsBoolean()
  @IsOptional()
  noMaxOrder?: boolean;

  @ApiPropertyOptional({ description: 'Чи без обсягів (пошук)' })
  @IsBoolean()
  @IsOptional()
  noOrder?: boolean;

  @ApiPropertyOptional({ description: 'Для перезарахування кредитів ЄКТС' })
  @IsBoolean()
  @IsOptional()
  forEctsTransfer?: boolean;

  @ApiPropertyOptional({ description: 'Чи акредитовані всі освітні програми конкурсної пропозиції' })
  @IsBoolean()
  @IsOptional()
  isAccredited?: boolean;

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
