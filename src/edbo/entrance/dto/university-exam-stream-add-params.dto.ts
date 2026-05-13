import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsDate, IsOptional } from 'class-validator';

export class UniversityExamStreamAddParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;

  @ApiProperty({ description: 'Дата та час проведення випробування (потік Х)' })
  @IsDate()
  universityExamDate!: Date;

  @ApiProperty({ description: 'Місце проведення випробування (потік Х)' })
  @IsString()
  universityExamVenue!: string;

  @ApiProperty({ description: 'Кінцева дата реєстрації на участь у вступному випробуванні в межах потоку (потік X)' })
  @IsDate()
  universityExamRequestDateEnd!: Date;

  @ApiPropertyOptional({ description: 'Максимальна кількість місць для участі в межах потоку (потік X)' })
  @IsInt()
  @IsOptional()
  universityExamRequestLimit?: number;

}
