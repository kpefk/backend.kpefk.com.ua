import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PersonRequestSubjectResultListParamsDto {
  @ApiProperty({ description: 'Ід заяви' })
  @IsInt()
  personRequestId!: number;
}
