import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class SpecialitiesDelParamsDto {
  @ApiProperty({ description: 'Ід КП' })
  @IsInt()
  universitySpecialitiesId!: number;

}
