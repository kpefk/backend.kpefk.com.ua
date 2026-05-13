import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamRequestSimpleParamsDto {
  @ApiProperty({ description: 'ID заяви на участь у випробуванні' })
  @IsInt()
  universityExamRequestId!: number;
}