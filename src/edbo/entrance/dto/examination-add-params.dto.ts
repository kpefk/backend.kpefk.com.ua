import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString } from 'class-validator';

export class ExaminationAddParamsDto {
  @ApiProperty({ description: 'Код закладу освіти', example: 1 })
  @IsInt()
  universityId!: number;

  @ApiProperty({
    description: 'Тип комісії: 1 — приймальна комісія, 2 — відбіркова',
    example: 1,
  })
  @IsInt()
  id_EntranceExaminationTypes!: number;

  @ApiPropertyOptional({ description: 'Голова комісії (ПІБ)', example: 'Іваненко Іван Іванович' })
  @IsOptional()
  @IsString()
  bossName?: string;

  @ApiPropertyOptional({ description: 'Адреса комісії', example: 'м. Київ, пр. Перемоги, 37' })
  @IsOptional()
  @IsString()
  adress?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'admission@university.edu.ua' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Телефон', example: '+380441234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Веб-сайт', example: 'https://university.edu.ua' })
  @IsOptional()
  @IsString()
  webSite?: string;

  @ApiPropertyOptional({ description: 'Коментар' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Секретар комісії (ПІБ)' })
  @IsOptional()
  @IsString()
  headBossName?: string;

  @ApiPropertyOptional({
    description: 'Дата початку роботи комісії',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateBegin?: Date;

  @ApiPropertyOptional({
    description: 'Дата завершення роботи комісії',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateEnd?: Date;

  @ApiPropertyOptional({ description: 'Код факультету (структурного підрозділу)', example: 1 })
  @IsOptional()
  @IsInt()
  id_UniversityFacultet?: number;

  @ApiPropertyOptional({ description: 'Адреса отримання документів' })
  @IsOptional()
  @IsString()
  adressDocumentGet?: string;

  @ApiPropertyOptional({ description: 'Контактний номер голови комісії', example: '+380441234567' })
  @IsOptional()
  @IsString()
  bossPhone?: string;
}
