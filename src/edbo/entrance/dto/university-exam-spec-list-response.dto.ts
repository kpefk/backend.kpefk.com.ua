import { ApiPropertyOptional } from '@nestjs/swagger';

export class UniversityExamSpecListResponseDto {
  @ApiPropertyOptional({ description: 'ID запису про прив\'язку КП' })
  universityExamSpecialitiesId?: number | null;

  @ApiPropertyOptional({ description: 'ID конкурсної пропозиції' })
  universitySpecialitiesId?: number | null;

  @ApiPropertyOptional({ description: 'Вид конкурсної пропозиції' })
  universitySpecialitiesTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Назва конкурсної пропозиції' })
  universitySpecialitiesName?: string | null;

  @ApiPropertyOptional({ description: 'Освітній ступінь' })
  qualificationGroupName?: string | null;

  @ApiPropertyOptional({ description: 'Вступ на основі' })
  educationBaseName?: string | null;

  @ApiPropertyOptional({ description: 'Спеціальність' })
  specialityFullName?: string | null;

  @ApiPropertyOptional({ description: 'Спеціалізація' })
  specializationFullName?: string | null;

  @ApiPropertyOptional({ description: 'Освітні програми' })
  studyProgramList?: string | null;

  @ApiPropertyOptional({ description: 'Тип програми магістра' })
  masterProgramTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Форма здобуття освіти' })
  educationFormName?: string | null;

  @ApiPropertyOptional({ description: 'Курс' })
  courseName?: string | null;

  @ApiPropertyOptional({ description: 'Структурний підрозділ' })
  universityFacultetFullName?: string | null;

  @ApiPropertyOptional({ description: 'Чи скорочений термін навчання' })
  isShortDuration?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи для перезарахування кредитів ЄКТС' })
  forEctsTransfer?: boolean | null;

}
