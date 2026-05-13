import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PersonRequestEDKIListParamsDto {
  @ApiProperty({ description: 'Код фізичної особи' })
  @IsInt()
  personId!: number;
}
