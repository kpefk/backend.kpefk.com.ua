import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamDeleteParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;

}
