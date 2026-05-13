import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonEducationsListForExternalItemDto {
  // ── Заклад освіти ─────────────────────────────────────────────────

  @ApiProperty({ description: 'Код закладу в ЄДЕБО', example: 1 })
  universityId!: number;

  // ── Особисті дані ─────────────────────────────────────────────────

  @ApiProperty({ description: 'Код картки фізичної особи в ЄДЕБО', example: 123 })
  personId!: number;

  @ApiProperty({ description: 'Код картки здобувача в ЄДЕБО', example: 456 })
  educationId!: number;

  @ApiProperty({ description: 'Прізвище', example: 'Іваненко' })
  lastName!: string;

  @ApiProperty({ description: "Власне ім'я", example: 'Іван' })
  firstName!: string;

  @ApiPropertyOptional({ description: 'По батькові', example: 'Іванович', nullable: true })
  middleName!: string | null;

  @ApiProperty({
    description: 'Дата народження',
    example: '2000-05-15T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  birthday!: string;

  @ApiPropertyOptional({ description: 'Країна громадянства (Id)', example: 1, nullable: true })
  countryId!: number | null;

  @ApiPropertyOptional({ description: 'Країна громадянства (Назва)', example: 'Україна', nullable: true })
  countryName!: string | null;

  @ApiPropertyOptional({ description: 'Стать', example: 'Чоловіча', nullable: true })
  personSexName!: string | null;

  @ApiPropertyOptional({ description: 'РНОКПП', example: '1234567890', nullable: true })
  rnokpp!: string | null;

  @ApiPropertyOptional({ description: 'УНЗР', example: '20000515-12345', nullable: true })
  unzr!: string | null;

  // ── Документ, що посвідчує особу ─────────────────────────────────

  @ApiPropertyOptional({ description: 'Тип документа (Id)', example: 1, nullable: true })
  passportDocumentTypeId!: number | null;

  @ApiPropertyOptional({
    description: 'Тип документа (Назва)',
    example: 'Паспорт громадянина України',
    nullable: true,
  })
  passportDocumentTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Серія документа', example: 'АА', nullable: true })
  passportDocumentSeries!: string | null;

  @ApiPropertyOptional({ description: 'Номер документа', example: '123456', nullable: true })
  passportDocumentNumbers!: string | null;

  @ApiPropertyOptional({
    description: 'Дата видачі документа',
    example: '2018-06-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  passportDocumentDateGet!: string | null;

  @ApiPropertyOptional({
    description: 'Термін дії документа',
    example: '2028-06-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  passportDocumentExpiredDate!: string | null;

  // ── Навчання ──────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Освітній ступінь (Id)', example: 1, nullable: true })
  qualificationGroupId!: number | null;

  @ApiPropertyOptional({ description: 'Освітній ступінь (Назва)', example: 'Бакалавр', nullable: true })
  qualificationGroupName!: string | null;

  @ApiPropertyOptional({ description: 'Форма навчання (Id)', example: 1, nullable: true })
  educationFormId!: number | null;

  @ApiPropertyOptional({ description: 'Форма навчання (Назва)', example: 'Денна', nullable: true })
  educationFormName!: string | null;

  @ApiPropertyOptional({ description: 'Джерело фінансування (Id)', example: 1, nullable: true })
  personEducationPaymentTypeId!: number | null;

  @ApiPropertyOptional({
    description: 'Джерело фінансування (Назва)',
    example: 'Державний бюджет',
    nullable: true,
  })
  personEducationPaymentTypeName!: string | null;

  // ── Спеціальність ─────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код спеціальності', example: '121', nullable: true })
  specialityCode!: string | null;

  @ApiPropertyOptional({
    description: 'Назва спеціальності',
    example: 'Інженерія програмного забезпечення',
    nullable: true,
  })
  specialityName!: string | null;

  @ApiPropertyOptional({ description: 'Код спеціалізації', example: '121.1', nullable: true })
  specializationCode!: string | null;

  @ApiPropertyOptional({ description: 'Назва спеціалізації', example: 'Веб-розробка', nullable: true })
  specializationName!: string | null;

  @ApiPropertyOptional({ description: 'Освітня програма (Id)', example: 1, nullable: true })
  studyProgramId!: number | null;

  @ApiPropertyOptional({ description: 'Освітня програма (Назва)', example: "Комп'ютерні науки", nullable: true })
  studyProgramName!: string | null;

  // ── Професії ─────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код класифікатора професії 1', example: '2131', nullable: true })
  professionClassifierCode1!: string | null;

  @ApiPropertyOptional({ description: 'Назва професії 1', example: 'Програміст', nullable: true })
  professionName1!: string | null;

  @ApiPropertyOptional({ description: 'Код класифікатора професії 2', nullable: true })
  professionClassifierCode2!: string | null;

  @ApiPropertyOptional({ description: 'Назва професії 2', nullable: true })
  professionName2!: string | null;

  @ApiPropertyOptional({ description: 'Код класифікатора професії 3', nullable: true })
  professionClassifierCode3!: string | null;

  @ApiPropertyOptional({ description: 'Назва професії 3', nullable: true })
  professionName3!: string | null;

  @ApiPropertyOptional({ description: 'Код класифікатора професії 4', nullable: true })
  professionClassifierCode4!: string | null;

  @ApiPropertyOptional({ description: 'Назва професії 4', nullable: true })
  professionName4!: string | null;

  @ApiPropertyOptional({ description: 'Код класифікатора професії 5', nullable: true })
  professionClassifierCode5!: string | null;

  @ApiPropertyOptional({ description: 'Назва професії 5', nullable: true })
  professionName5!: string | null;

  // ── Курс / Група ──────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Поточний курс навчання', example: '2', nullable: true })
  courseName!: string | null;

  @ApiPropertyOptional({ description: 'Навчальна група', example: 'ІС-42', nullable: true })
  groupName!: string | null;

  // ── Документ про освіту при вступі ───────────────────────────────

  @ApiPropertyOptional({ description: 'Вступ на основі (Id)', example: 1, nullable: true })
  educationBaseId!: number | null;

  @ApiPropertyOptional({
    description: 'Вступ на основі (Назва)',
    example: 'Повна загальна середня освіта',
    nullable: true,
  })
  educationBaseName!: string | null;

  @ApiPropertyOptional({ description: 'Тип документу про освіту (Id)', example: 1, nullable: true })
  educationDocumentTypeId!: number | null;

  @ApiPropertyOptional({
    description: 'Тип документу про освіту (Назва)',
    example: 'Атестат про повну загальну середню освіту',
    nullable: true,
  })
  educationDocumentTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Серія документу про освіту', example: 'АА', nullable: true })
  educationDocumentSeries!: string | null;

  @ApiPropertyOptional({ description: 'Номер документу про освіту', example: '123456', nullable: true })
  educationDocumentNumbers!: string | null;

  @ApiPropertyOptional({
    description: 'Дата видачі документу про освіту',
    example: '2022-06-20T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  educationDocumentDateGet!: string | null;

  // ── Пільги та статус ──────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Категорія особи зі спеціальними умовами вступу',
    example: 'Учасник бойових дій',
    nullable: true,
  })
  personSpecialCategoryName!: string | null;

  // ── Дати навчання ─────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Початок навчання (дата)',
    example: '2022-09-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  educationDateBegin!: string | null;

  @ApiPropertyOptional({ description: 'Початок навчання (наказ)', example: 'Наказ №123 від 01.09.2022', nullable: true })
  educationBeginInfo!: string | null;

  @ApiPropertyOptional({
    description: 'Закінчення навчання (дата)',
    example: '2026-06-30T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  educationDateEnd!: string | null;

  @ApiPropertyOptional({ description: 'Закінчення навчання (наказ)', nullable: true })
  educationEndInfo!: string | null;

  // ── Відрахування ──────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Причина відрахування (Id)', example: 1, nullable: true })
  expelEducationTypeId!: number | null;

  @ApiPropertyOptional({
    description: 'Причина відрахування (Назва)',
    example: 'За власним бажанням',
    nullable: true,
  })
  expelEducationTypeName!: string | null;

  @ApiPropertyOptional({
    description: 'Дата відрахування',
    example: '2024-12-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  expelEducationDate!: string | null;

  // ── Актуальний статус навчання ────────────────────────────────────

  @ApiPropertyOptional({ description: 'Статус навчання (Id)', example: 1, nullable: true })
  personEducationHistoryTypeId!: number | null;

  @ApiPropertyOptional({ description: 'Статус навчання (Назва)', example: 'Навчається', nullable: true })
  personEducationHistoryTypeName!: string | null;

  @ApiPropertyOptional({
    description: 'Дата початку дії актуального статусу',
    example: '2024-09-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  statusBeginDate!: string | null;

  @ApiPropertyOptional({
    description: 'Дата останнього редагування картки здобувача',
    example: '2024-10-15T14:30:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  modifyDate!: string | null;
}

/** Відповідь: масив карток здобувачів для зовнішніх систем */
export type PersonEducationsListForExternalResponseDto =
  PersonEducationsListForExternalItemDto[];
