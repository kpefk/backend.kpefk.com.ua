import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PersonRequestStatusesHistoryParamsDto {
  @ApiProperty({ description: 'Код заяви' })
  @IsInt()
  personRequestId!: number;
}
