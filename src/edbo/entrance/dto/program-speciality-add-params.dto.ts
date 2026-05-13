import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ProgramSpecialityAddParamsDto {
  @ApiProperty({ description: '' })
  @IsInt()
  universitySpecialitiesId!: number;

  @ApiProperty({ description: '' })
  @IsInt()
  universityStudyProgramId!: number;

}
