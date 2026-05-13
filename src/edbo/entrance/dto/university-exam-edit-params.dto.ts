import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class UniversityExamEditParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;

  @ApiProperty({ description: 'ID форми випробування' })
  @IsInt()
  examFormId!: number;

  @ApiPropertyOptional({ description: 'ID предмету вступного випробування (з довідника)' })
  @IsInt()
  @IsOptional()
  subjectId?: number;

  @ApiPropertyOptional({ description: 'Назва вступного випробування (не з довідника)' })
  @IsString()
  @IsOptional()
  subjectName?: string;

  @ApiPropertyOptional({ description: 'ID спеціальності (для творчих конкурсів)' })
  @IsInt()
  @IsOptional()
  specialityId?: number;

  @ApiPropertyOptional({ description: 'ID спеціалізації (для творчих конкурсів)' })
  @IsInt()
  @IsOptional()
  specializationId?: number;

}
