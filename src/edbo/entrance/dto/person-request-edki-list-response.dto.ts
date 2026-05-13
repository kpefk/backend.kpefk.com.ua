import { ApiPropertyOptional } from '@nestjs/swagger';

/** Відповідь /personRequest/EDKITechnology/list */
export class PersonRequestEDKIListResponseDto {
  @ApiPropertyOptional({ description: 'Код результату ЄДКІ' })
  edkiResultId?: number | null;

  @ApiPropertyOptional({ description: 'Рік складання ЄДКІ' })
  passedYear?: number | null;

  @ApiPropertyOptional({ description: 'Чи складено' })
  isPassed?: boolean | null;

  @ApiPropertyOptional({ description: 'Бал ЄДКІ' })
  passedValue?: number | null;

  @ApiPropertyOptional({ description: 'Код спеціальності, з якої складався ЄДКІ' })
  specialityCode?: string | null;

  @ApiPropertyOptional({ description: 'Назва спеціальності, з якої складався ЄДКІ' })
  specialityName?: string | null;

  @ApiPropertyOptional({ description: 'ID сертифікату в документах фіз.особи' })
  personDocumentId?: number | null;

  @ApiPropertyOptional({ description: 'Номер документу' })
  documentNumbers?: string | null;
}
