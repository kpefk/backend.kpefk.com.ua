import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UniversityExamsUpdateParamsDto {
  @ApiProperty({ description: 'ID запису про вступне випробування' })
  @IsInt()
  universityExamId!: number;

  @ApiProperty({ description: 'ID форми випробування' })
  @IsInt()
  examFormId!: number;

  @ApiProperty({ description: 'ID предмету вступного випробування (з довідника)' })
  @IsInt()
  @IsOptional()
  subjectId?: number;

  @ApiProperty({ description: 'Назва вступного випробування (не з довідника)' })
  @IsString()
  @IsOptional()
  subjectName?: string;

  @ApiProperty({ description: 'ID спеціальності (для творчих конкурсів)' })
  @IsInt()
  @IsOptional()
  specialityId?: number;

  @ApiProperty({ description: 'ID спеціалізації (для творчих конкурсів)' })
  @IsInt()
  @IsOptional()
  specializationId?: number;
}