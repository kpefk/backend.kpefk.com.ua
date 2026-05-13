import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UniversityExamSpecsAddParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;

  @ApiProperty({ description: 'ID конкурсної пропозиції' })
  @IsInt()
  universitySpecialitiesId!: number;
}