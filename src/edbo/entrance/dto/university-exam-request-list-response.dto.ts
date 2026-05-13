import { ApiPropertyOptional } from '@nestjs/swagger';

export class UniversityExamRequestListResponseDto {
  @ApiPropertyOptional({ description: 'ID заяви на участь у випробуванні' })
  universityExamRequestId?: number | null;

  @ApiPropertyOptional({ description: 'ID фіз.особи' })
  personId?: number | null;

  @ApiPropertyOptional({ description: 'guid код фіз. особи' })
  personCode?: string | null;

  @ApiPropertyOptional({ description: 'ПІБ вступника' })
  fio?: string | null;

  @ApiPropertyOptional({ description: 'Дата народження вступника' })
  birthday?: Date | null;

  @ApiPropertyOptional({ description: 'Контактні телефони, вказані вступником у електронному кабінеті' })
  personPhone?: string | null;

  @ApiPropertyOptional({ description: 'E-mail, вказаний вступником у електронному кабінеті' })
  personEmail?: string | null;

  @ApiPropertyOptional({ description: 'Громадянство вступника' })
  countryName?: string | null;

  @ApiPropertyOptional({ description: 'Стать вступника' })
  personSexName?: string | null;

  @ApiPropertyOptional({ description: 'ID статусу заяви на участь у випробуванні' })
  examRequestStatusId?: number | null;

  @ApiPropertyOptional({ description: 'Статус заяви на участь у випробуванні' })
  examRequestStatusName?: string | null;

  @ApiPropertyOptional({ description: 'Коментар закладу до зміни статусу' })
  comment?: string | null;

  @ApiPropertyOptional({ description: 'Дата та час проведення випробування (обраний потік)' })
  universityExamDate?: Date | null;

  @ApiPropertyOptional({ description: 'Місце проведення випробування (обраний потік)' })
  universityExamVenue?: string | null;

  @ApiPropertyOptional({ description: 'Чи подано з електронного кабінету вступника' })
  isEz?: boolean | null;

  @ApiPropertyOptional({ description: 'Дата та час подачі заяви' })
  createDate?: Date | null;

  @ApiPropertyOptional({ description: 'Код потоку випробування' })
  universityExamStreamId?: number | null;
}
