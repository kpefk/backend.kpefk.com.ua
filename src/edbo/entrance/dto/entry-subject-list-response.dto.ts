import { ApiPropertyOptional } from '@nestjs/swagger';

export class EntrySubjectListResponseDto {
  @ApiPropertyOptional({ description: 'Код випробування КП' })
  universitySpecialitySubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Додаткова назва / Назва випробування / Назва конкурсного показника' })
  universitySpecialitiesSubjectsName?: string | null;

  @ApiPropertyOptional({ description: 'Код форми випробування' })
  examFormId?: number | null;

  @ApiPropertyOptional({ description: 'Назва форми випрбування' })
  examFormName?: string | null;

  @ApiPropertyOptional({ description: 'Код показника / випробування' })
  subjectId?: number | null;

  @ApiPropertyOptional({ description: '' })
  subjectKey?: string | null;

  @ApiPropertyOptional({ description: 'Назва показника / випробування' })
  subjectName?: string | null;

  @ApiPropertyOptional({ description: 'Коефіцієнт' })
  coefficient?: number | null;

  @ApiPropertyOptional({ description: 'Мінміальна кількість балів' })
  minValue?: number | null;

  @ApiPropertyOptional({ description: 'Чи на вибір вступника' })
  isChoosing?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи додаткове випробування' })
  isAdditional?: boolean | null;

  @ApiPropertyOptional({ description: 'Номер конкурсного предмету' })
  subjectNumber?: number | null;

  @ApiPropertyOptional({ description: 'Кількість турів творчого конкурсу' })
  creativeContestLevel?: number | null;

  @ApiPropertyOptional({ description: 'Дата та час останньої зміни' })
  dateLastChange?: Date | null;

}
