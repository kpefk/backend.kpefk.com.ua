import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamRequestPhotoParamsDto {
  @ApiProperty({ description: 'ID заяви на участь у випробуванні' })
  @IsInt()
  universityExamRequestId!: number;
}
