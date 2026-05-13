import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamRequestAddParamsDto {
  @ApiProperty({ description: 'ID запису про потік вступного випробування' })
  @IsInt()
  universityExamStreamId!: number;

  @ApiProperty({ description: 'ID фіз.особи' })
  @IsInt()
  personId!: number;
}
