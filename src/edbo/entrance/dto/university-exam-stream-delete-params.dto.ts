import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamStreamDeleteParamsDto {
  @ApiProperty({ description: 'ID запису про потік' })
  @IsInt()
  universityExamStreamId!: number;

}
