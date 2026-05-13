import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsDate, IsOptional } from 'class-validator';

export class SpecialitiesUpdateParamsDto {
  @ApiProperty({ description: '' })
  @IsInt()
  universitySpecialitiesId!: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  universityFacultetId?: number;

  @ApiProperty({ description: '' })
  @IsString()
  universitySpecialitiesName!: string;

  @ApiPropertyOptional({ description: '' })
  @IsString()
  @IsOptional()
  universitySpecialitiesNameEng?: string;

  @ApiProperty({ description: '' })
  @IsInt()
  qualificationGroupId!: number;

  @ApiProperty({ description: '' })
  @IsInt()
  educationBaseId!: number;

  @ApiProperty({ description: '' })
  @IsInt()
  specialityId!: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  specializationId?: number;

  @ApiProperty({ description: '' })
  @IsInt()
  educationFormId!: number;

  @ApiProperty({ description: '' })
  @IsInt()
  courseId!: number;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  isShortDuration?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  durationEducationMonth?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  durationEducationYear?: number;

  @ApiProperty({ description: '' })
  @IsDate()
  educationDateBegin!: Date;

  @ApiProperty({ description: '' })
  @IsDate()
  educationDateEnd!: Date;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  isSecondEducation?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  canForeign?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsDate()
  @IsOptional()
  eDUProgramChooseDate?: Date;

  @ApiPropertyOptional({ description: 'Вартість навчання за рік (контракт)' })
  @IsInt()
  @IsOptional()
  educationPrice?: number;

  @ApiPropertyOptional({ description: 'Ід валюти' })
  @IsInt()
  @IsOptional()
  currencyId?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  entranceExaminationId?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  universitySpecialitiesTypeId?: number;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  isUsePriority?: boolean;

  @ApiProperty({ description: '' })
  @IsDate()
  announceRecListDate!: Date;

  @ApiPropertyOptional({ description: '' })
  @IsDate()
  @IsOptional()
  personRequestDateStart?: Date;

  @ApiPropertyOptional({ description: '' })
  @IsDate()
  @IsOptional()
  personRequestDateEnd?: Date;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  maxOrder?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  maxOrderQ1?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  maxOrderQ2?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  minOrder?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  orderQ1?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  orderQ2?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  orderForeign?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  orderContract?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  orderLicense?: number;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  isAlgCanceled?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  isApplied?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  needApprove?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  hasOrder?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  hasMaxOrder?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  masterProgramTypeId?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  specialEntryTypeId?: number;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  regionGovernanceTypeId?: number;

  @ApiPropertyOptional({ description: '' })
  @IsBoolean()
  @IsOptional()
  isCountEducationAllTermPrice?: boolean;

  @ApiPropertyOptional({ description: '' })
  @IsInt()
  @IsOptional()
  educationAllTermPrice?: number;

  @ApiPropertyOptional({ description: 'Для перезарахування кредитів ЄКТС' })
  @IsBoolean()
  @IsOptional()
  forEctsTransfer?: boolean;

}
