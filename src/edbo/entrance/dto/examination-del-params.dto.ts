import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ExaminationDelParamsDto {
  @ApiProperty({ description: 'ID комісії для видалення', example: 1 })
  @IsInt()
  id_EntranceExamination!: number;
}
