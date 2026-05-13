import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PersonRequestMotivationLetterGetParamsDto {
  @ApiProperty({ description: 'Код заяви' })
  @IsInt()
  personRequestId!: number;
}
