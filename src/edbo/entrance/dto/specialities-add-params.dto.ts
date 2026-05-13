import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsDate, IsOptional } from 'class-validator';

export class SpecialitiesAddParamsDto {
  @ApiProperty({ description: 'Код закладу' })
  @IsInt()
  universityID!: number;

  @ApiProperty({ description: 'Назва КП' })
  @IsString()
  universitySpecialitiesName!: string;

  @ApiPropertyOptional({ description: 'Назва КП іншою мовою' })
  @IsString()
  @IsOptional()
  universitySpecialitiesNameEng?: string;

  @ApiPropertyOptional({ description: 'Вид пропозиції' })
  @IsInt()
  @IsOptional()
  universitySpecialitiesTypeId?: number;

  @ApiProperty({ description: 'Освітній ступінь' })
  @IsInt()
  qualificationGroupId!: number;

  @ApiProperty({ description: 'Вступ на основі' })
  @IsInt()
  educationBaseId!: number;

  @ApiProperty({ description: 'Спеціальність' })
  @IsInt()
  specialityId!: number;

  @ApiPropertyOptional({ description: 'Спеціалізація' })
  @IsInt()
  @IsOptional()
  specializationId?: number;

  @ApiProperty({ description: 'Форма здобуття освіти' })
  @IsInt()
  educationFormId!: number;

  @ApiProperty({ description: 'Курс зарахування' })
  @IsInt()
  courseId!: number;

  @ApiPropertyOptional({ description: 'Структурний підрозділ' })
  @IsInt()
  @IsOptional()
  universityFacultetId?: number;

  @ApiPropertyOptional({ description: 'Скорочений термін навчання' })
  @IsBoolean()
  @IsOptional()
  isShortDuration?: boolean;

  @ApiPropertyOptional({ description: 'Термін навчання (місяців)' })
  @IsInt()
  @IsOptional()
  durationEducationMonth?: number;

  @ApiPropertyOptional({ description: 'Термін навчання (років)' })
  @IsInt()
  @IsOptional()
  durationEducationYear?: number;

  @ApiProperty({ description: 'Дата початку навчання' })
  @IsDate()
  educationDateBegin!: Date;

  @ApiProperty({ description: 'Дата закінчення навчання' })
  @IsDate()
  educationDateEnd!: Date;

  @ApiPropertyOptional({ description: 'Здобуття ступеня за іншою спеціальністю' })
  @IsBoolean()
  @IsOptional()
  isSecondEducation?: boolean;

  @ApiPropertyOptional({ description: 'Можуть навчатися іноземці' })
  @IsBoolean()
  @IsOptional()
  canForeign?: boolean;

  @ApiPropertyOptional({ description: 'Дата вибору освітньої програми' })
  @IsDate()
  @IsOptional()
  eDUProgramChooseDate?: Date;

  @ApiPropertyOptional({ description: 'Комісія' })
  @IsInt()
  @IsOptional()
  entranceExaminationId?: number;

  @ApiPropertyOptional({ description: 'Чи використовувати приорітетність заяв' })
  @IsBoolean()
  @IsOptional()
  isUsePriority?: boolean;

  @ApiProperty({ description: 'Дата оголошення першого списку рекомендованих на загальних умовах' })
  @IsDate()
  announceRecListDate!: Date;

  @ApiPropertyOptional({ description: 'Початок прийому заяв' })
  @IsDate()
  @IsOptional()
  personRequestDateStart?: Date;

  @ApiPropertyOptional({ description: 'Закінчення прийому заяв' })
  @IsDate()
  @IsOptional()
  personRequestDateEnd?: Date;

  @ApiPropertyOptional({ description: 'Тип освітньої програми (для програми магістра)' })
  @IsInt()
  @IsOptional()
  masterProgramTypeId?: number;

  @ApiPropertyOptional({ description: 'Особливий вступ (освітні центри)' })
  @IsInt()
  @IsOptional()
  specialEntryTypeId?: number;

  @ApiPropertyOptional({ description: 'Регіонального замовлення від (орган управління)' })
  @IsInt()
  @IsOptional()
  regionGovernanceTypeId?: number;

  @ApiPropertyOptional({ description: 'Вартість навчання за рік (контракт)' })
  @IsInt()
  @IsOptional()
  educationPrice?: number;

  @ApiPropertyOptional({ description: 'Валюта вартості навчання' })
  @IsInt()
  @IsOptional()
  currencyId?: number;

  @ApiPropertyOptional({ description: 'Чи розрахувати вартість за повний термін автоматично' })
  @IsBoolean()
  @IsOptional()
  isCountEducationAllTermPrice?: boolean;

  @ApiPropertyOptional({ description: 'Загальна вартість за повний термін навчання' })
  @IsInt()
  @IsOptional()
  educationAllTermPrice?: number;

  @ApiPropertyOptional({ description: 'Чи КП для перезарахування кредитів ЄКТС (для вступу на основі МС, ФМБ, МБ)' })
  @IsBoolean()
  @IsOptional()
  forEctsTransfer?: boolean;

}
