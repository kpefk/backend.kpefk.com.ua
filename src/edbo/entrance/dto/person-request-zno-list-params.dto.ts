import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PersonRequestZNOListParamsDto {
  @ApiProperty({ description: 'Код фізичної особи в ЄДЕБО' })
  @IsInt()
  personId!: number;
}
