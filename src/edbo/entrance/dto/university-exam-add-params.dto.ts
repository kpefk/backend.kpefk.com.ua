import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UniversityExamAddParamsDto {
  @ApiProperty({ description: 'Код закладу освіти' })
  @IsInt()
  universityId!: number;

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
