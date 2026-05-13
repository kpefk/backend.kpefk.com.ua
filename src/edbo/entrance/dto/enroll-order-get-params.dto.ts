import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class EnrollOrderGetParamsDto {
  @ApiProperty({ description: 'ID запису наказу на зарахування', example: 1 })
  @IsInt()
  orderOfEnrollmentId!: number;
}
