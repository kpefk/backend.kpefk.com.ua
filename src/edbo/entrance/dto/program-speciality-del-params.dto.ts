import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ProgramSpecialityDelParamsDto {
  @ApiProperty({ description: '' })
  @IsInt()
  eduProgramUniSpecialityLinksId!: number;

}
