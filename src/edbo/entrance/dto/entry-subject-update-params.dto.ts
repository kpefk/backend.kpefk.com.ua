import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class EntrySubjectUpdateParamsDto {
  @ApiProperty({ description: 'Код вступного випробування / показника' })
  @IsInt()
  universitySpecialitySubjectId!: number;

  @ApiProperty({ description: 'Код форми випробування. Перелік всіх форм див. dictionary/get з ключем  ENT_ExamForm' })
  @IsInt()
  examFormId!: number;

  @ApiPropertyOptional({ description: 'Код показника / випробування. Перелік доступних випробувань для форми випробування та КП див. dictionary/subject' })
  @IsInt()
  @IsOptional()
  subjectId?: number;

  @ApiPropertyOptional({ description: 'Додаткова назва / Назва випробування / Назва конкурсного показника' })
  @IsString()
  @IsOptional()
  universitySpecialitiesSubjectsName?: string;

  @ApiProperty({ description: 'Чи на вибір вступника' })
  @IsBoolean()
  isChoosing!: boolean;

  @ApiPropertyOptional({ description: 'Коефіцієнт' })
  @IsInt()
  @IsOptional()
  coefficient?: number;

  @ApiPropertyOptional({ description: 'Мінімальна кількість балів' })
  @IsInt()
  @IsOptional()
  minValue?: number;

  @ApiProperty({ description: 'Чи додаткове випробування' })
  @IsBoolean()
  isAdditional!: boolean;

  @ApiPropertyOptional({ description: 'Номер конкурсного предмету' })
  @IsInt()
  @IsOptional()
  subjectNumber?: number;

  @ApiPropertyOptional({ description: 'Кількість турів творчих конкурсів, заповнюється лише для ФМБ при вступі на основі ПЗСО/БЗСО             Для форми випробування "Творчий конкурс"' })
  @IsInt()
  @IsOptional()
  creativeContestLevel?: number;

}
