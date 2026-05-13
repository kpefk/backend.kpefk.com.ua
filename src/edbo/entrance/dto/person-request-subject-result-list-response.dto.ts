import { ApiPropertyOptional } from '@nestjs/swagger';

export class PersonRequestSubjectResultListResponseDto {
  @ApiPropertyOptional({ description: 'Ід значення показника (результату) в заяві' })
  requestSubjectResultId?: number | null;

  @ApiPropertyOptional({ description: 'Ід КП' })
  universitySpecialitySubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Ід форми вступного випробування' })
  examFormId?: number | null;

  @ApiPropertyOptional({ description: 'Форма випробування' })
  examFormName?: string | null;

  @ApiPropertyOptional({ description: 'Ід предмету випробування/показника' })
  subjectId?: number | null;

  @ApiPropertyOptional({ description: 'Код предмету випробування/показника' })
  subjectKey?: string | null;

  @ApiPropertyOptional({ description: 'Назва предмету випробування/показника' })
  subjectName?: string | null;

  @ApiPropertyOptional({ description: 'Коефіцієнт' })
  coefficient?: number | null;

  @ApiPropertyOptional({ description: 'МКБ (Мінімальна кількість балів)' })
  minValue?: number | null;

  @ApiPropertyOptional({ description: 'В (Чи на вибір вступника)' })
  isChoosing?: boolean | null;

  @ApiPropertyOptional({ description: 'Номер конкурсного предмета' })
  subjectNumber?: number | null;

  @ApiPropertyOptional({ description: 'Д (Чи додаткове випробування)' })
  isAdditional?: boolean | null;

  @ApiPropertyOptional({ description: 'Ід запису про оцінку сертифікату НМТ (ЗНО) особи' })
  personDocumentSubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Дата отримання сертифікату НМТ (ЗНО)' })
  documentDateGet?: Date | null;

  @ApiPropertyOptional({ description: 'Номер сертифікату НМТ (ЗНО)' })
  documentNumbers?: string | null;

  @ApiPropertyOptional({ description: 'Бал сертифікату НМТ (ЗНО)' })
  personDocumentSubjectValue?: number | null;

  @ApiPropertyOptional({ description: 'Інформація про результат НМТ (ЗНО)' })
  personDocumentSubjectName?: string | null;

  @ApiPropertyOptional({ description: 'Ід запису про результат випробування ЄВІ/ЄФВВ' })
  znoTechnologySubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Інформація про результат випробування ЄВІ/ЄФВВ' })
  znoTechnologySubjectName?: string | null;

  @ApiPropertyOptional({ description: 'Ід запису про результат ЄДКІ' })
  edkiTechnologySubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Інформація про результат ЄДКІ' })
  edkiTechnologySubjectName?: string | null;

  @ApiPropertyOptional({ description: 'Чи бал внесено сертифікатом (НМТ/ЗНО або ЄВІ/ЄФВВ, або ЄДКІ)' })
  isZNO?: boolean | null;

  @ApiPropertyOptional({ description: 'Результат' })
  mainScore?: number | null;

  @ApiPropertyOptional({ description: 'ДБО (Додатковий бал від участі у Всеукраїнській олімпіаді)' })
  additionalScore?: number | null;

  @ApiPropertyOptional({ description: 'Б200 (Зараховано 200 балів як учаснику міжнародних олімпіад)' })
  extra200Score?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи поле «Результат» потребує заповнення' })
  isMarkMainResult?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи поле «ДБО» потребує заповнення' })
  isMarkAdditionalResult?: boolean | null;

  @ApiPropertyOptional({ description: 'Підсумок' })
  finalResult?: number | null;

  @ApiPropertyOptional({ description: 'Внесок в КБ' })
  cbPart?: number | null;

  @ApiPropertyOptional({ description: 'Дата останньої зміни' })
  dateLastChange?: Date | null;
}
