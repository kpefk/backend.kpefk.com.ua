import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamSpecDeleteParamsDto {
  @ApiProperty({ description: 'ID запису про прив\'язку КП' })
  @IsInt()
  universityExamSpecialitiesId!: number;

}
