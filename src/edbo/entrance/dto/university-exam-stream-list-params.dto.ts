import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamStreamListParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;
}