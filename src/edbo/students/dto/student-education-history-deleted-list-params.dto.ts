import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class StudentEducationHistoryDeletedListDto {
  @ApiProperty({
    description: 'Код картки здобувача освіти',
    example: 456,
  })
  @IsInt()
  educationId!: number;
}