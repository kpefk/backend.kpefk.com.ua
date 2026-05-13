import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CancellationDelParamsDto {
  @ApiProperty({ description: 'Номер акту про технічні помилки', example: 1 })
  @IsInt()
  requestCancellationId!: number;
}
