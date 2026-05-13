import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UniversityExamRequestChangeStatusParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;

  @ApiProperty({ description: 'Перелік ID заяв на участь у випробуванні', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  requestList!: number[];

  @ApiProperty({ description: 'ID статусу заяви, який встановити' })
  @IsInt()
  @IsOptional()
  examRequestStatusId?: number;

  @ApiProperty({ description: 'Коментар закладу освіти (виводиться вступнику)' })
  @IsString()
  @IsOptional()
  comment?: string;
}