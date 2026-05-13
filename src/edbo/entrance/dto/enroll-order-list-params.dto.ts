import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class EnrollOrderListParamsDto {
  @ApiProperty({ description: 'ID вступної кампанії', example: 1 })
  @IsInt()
  receptionSeasonId!: number;

  @ApiProperty({ description: 'Код закладу освіти', example: 1 })
  @IsInt()
  universityId!: number;

  @ApiPropertyOptional({ description: 'ID запису наказу (фільтр)', example: 1 })
  @IsOptional()
  @IsInt()
  orderOfEnrollmentId?: number;

  @ApiPropertyOptional({ description: 'Номер наказу (фільтр)', example: '123-з' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({
    description: 'Дата наказу (фільтр)',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  orderDate?: Date;

  @ApiPropertyOptional({ description: 'Номер протоколу (фільтр)', example: 'П-15' })
  @IsOptional()
  @IsString()
  orderNumberProtocol?: string;

  @ApiPropertyOptional({
    description: 'Дата протоколу (фільтр)',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  orderDateDecision?: Date;

  @ApiPropertyOptional({
    description: 'Дата зарахування (фільтр)',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  orderDateEnrollment?: Date;

  @ApiPropertyOptional({ description: 'ID джерела фінансування (фільтр)', example: 1 })
  @IsOptional()
  @IsInt()
  paymentTypeId?: number;

  @ApiPropertyOptional({ description: 'ID форми навчання (фільтр)', example: 1 })
  @IsOptional()
  @IsInt()
  educationFormId?: number;

  @ApiPropertyOptional({ description: 'ID рівня освіти (фільтр)', example: 1 })
  @IsOptional()
  @IsInt()
  qualificationGroupId?: number;

  @ApiPropertyOptional({ description: 'ID вступу на основі (фільтр)', example: 1 })
  @IsOptional()
  @IsInt()
  educationBaseId?: number;

  @ApiPropertyOptional({ description: 'ID курсу (фільтр)', example: 1 })
  @IsOptional()
  @IsInt()
  courseId?: number;

  @ApiPropertyOptional({ description: 'Номер сторінки (починаючи з 0)', example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pageNo?: number;

  @ApiPropertyOptional({ description: 'Розмір сторінки (за замовчуванням 20)', example: 20 })
  @IsOptional()
  @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Поле сортування. Суфікс " DESC" для зворотного напрямку', example: 'orderOfEnrollmentDate DESC' })
  @IsOptional()
  @IsString()
  sortField?: string;
}
