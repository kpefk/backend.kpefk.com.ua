import { ApiPropertyOptional } from '@nestjs/swagger';

/** Відповідь /personRequest/ZNOTechnology/list */
export class PersonRequestZNOListResponseDto {
  @ApiPropertyOptional({ description: 'Код результату іспиту за технологією ЗНО (ЄВІ/ЄФВВ)' })
  znoTechnologySubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Рік складання іспиту за технологією ЗНО (ЄВІ/ЄФВВ)' })
  subjectYear?: number | null;

  @ApiPropertyOptional({ description: 'Бал іспиту за технологією ЗНО (ЄВІ/ЄФВВ)' })
  subjectValue?: number | null;

  @ApiPropertyOptional({ description: 'Код предмету' })
  subjectId?: number | null;

  @ApiPropertyOptional({ description: 'Назва предмету' })
  subjectName?: string | null;

  @ApiPropertyOptional({ description: 'ID сертифікату в документах фіз.особи' })
  personDocumentId?: number | null;

  @ApiPropertyOptional({ description: 'Номер документу' })
  documentNumbers?: string | null;
}
