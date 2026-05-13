import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentEducationHistoryDeletedListItemDto {
  // ── Поля видалення ────────────────────────────────────────────────

  @ApiProperty({
    description: 'Користувач, що видалив запис (ПІБ)',
    example: 'Іваненко Іван Іванович',
  })
  deletedUserPIB!: string;

  @ApiProperty({
    description: 'Дата видалення запису',
    example: '2024-11-15T10:30:00+03:00',
    type: String,
    format: 'date-time',
  })
  deletedDate!: string;

  // ── Ідентифікатори ────────────────────────────────────────────────

  @ApiProperty({ description: 'Код картки навчання', example: 456 })
  educationId!: number;

  @ApiProperty({ description: 'Код запису в історії навчання', example: 789 })
  educationHistoryId!: number;

  // ── Статус навчання ───────────────────────────────────────────────

  @ApiProperty({ description: 'Чи заблоковано запис', example: false })
  isBlocked!: boolean;

  @ApiProperty({ description: 'Код статусу навчання', example: 1 })
  historyTypeId!: number;

  @ApiProperty({ description: 'Назва статусу навчання', example: 'Навчається' })
  personEducationHistoryTypeName!: string;

  @ApiProperty({
    description: 'Дата "Діє з" статусу навчання',
    example: '2024-09-01T00:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  dateBegin!: string;

  @ApiPropertyOptional({
    description: 'Дата "Діє по" статусу навчання',
    example: '2025-02-28T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  dateEnd!: string | null;

  // ── Форма навчання ────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код форми навчання', example: 1, nullable: true })
  educationFormId!: number | null;

  @ApiPropertyOptional({ description: 'Назва форми навчання', example: 'Денна', nullable: true })
  educationFormName!: string | null;

  @ApiProperty({ description: 'Чи здобуває освітній ступінь за дуальною формою навчання', example: false })
  isDualForm!: boolean;

  // ── Освітній ступінь ──────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код освітнього ступеня', example: 1, nullable: true })
  qualificationGroupId!: number | null;

  @ApiPropertyOptional({ description: 'Назва освітнього ступеня', example: 'Бакалавр', nullable: true })
  qualificationGroupName!: string | null;

  @ApiPropertyOptional({ description: 'Код вступу на основі', example: 1, nullable: true })
  baseQualificationId!: number | null;

  @ApiPropertyOptional({
    description: 'Назва вступу на основі',
    example: 'Повна загальна середня освіта',
    nullable: true,
  })
  baseQualificationName!: string | null;

  @ApiProperty({ description: 'Чи скорочений термін навчання', example: false })
  isShortTerm!: boolean;

  // ── Аудит запису ─────────────────────────────────────────────────

  @ApiProperty({
    description: 'Дата внесення запису',
    example: '2024-09-01T09:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  createDate!: string;

  @ApiProperty({ description: 'Код користувача, що вніс запис', example: 10 })
  createUserId!: number;

  @ApiProperty({ description: 'ПІБ користувача, що вніс запис', example: 'Петренко Петро Петрович' })
  createUserPIB!: string;

  @ApiProperty({
    description: 'Дата останньої зміни запису',
    example: '2024-10-01T11:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  modifyDate!: string;

  @ApiProperty({ description: 'Код користувача, що вніс зміни', example: 10 })
  modifyUserId!: number;

  @ApiProperty({ description: 'ПІБ користувача, що вніс зміни', example: 'Петренко Петро Петрович' })
  modifyUserPIB!: string;

  @ApiPropertyOptional({
    description: 'Коментар до запису',
    example: 'Відрахований за власним бажанням',
    nullable: true,
  })
  description!: string | null;

  // ── Фінансування ──────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код джерела фінансування', example: 1, nullable: true })
  paymentTypeId!: number | null;

  @ApiPropertyOptional({
    description: 'Назва джерела фінансування',
    example: 'Державний бюджет',
    nullable: true,
  })
  personEducationPaymentTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Рік бюджету', example: 2024, nullable: true })
  budgetYear!: number | null;

  @ApiProperty({ description: 'Чи регіональне замовлення', example: false })
  isRegionGovernanceOrder!: boolean;

  // ── Спеціальність ─────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Редакція спеціальності', example: 1, nullable: true })
  redactionId!: number | null;

  @ApiPropertyOptional({ description: 'Код спеціальності', example: 121, nullable: true })
  specialityId!: number | null;

  @ApiPropertyOptional({
    description: 'Назва спеціальності',
    example: 'Інженерія програмного забезпечення',
    nullable: true,
  })
  specialityName!: string | null;

  @ApiPropertyOptional({ description: 'Назва спеціалізації', example: 'Веб-розробка', nullable: true })
  specializationName!: string | null;

  @ApiPropertyOptional({ description: 'Код спеціалізації закладу освіти', example: 1, nullable: true })
  universitySpecializationId!: number | null;

  @ApiPropertyOptional({ description: 'Код освітньої програми', example: 1, nullable: true })
  universityStudyProgramId!: number | null;

  @ApiPropertyOptional({ description: 'Назва освітньої програми', example: "Комп'ютерні науки", nullable: true })
  studyProgramName!: string | null;

  @ApiPropertyOptional({
    description: 'Тип освітньої програми магістра',
    example: 'Науково-дослідницька',
    nullable: true,
  })
  masterProgramTypeName!: string | null;

  // ── Структурний підрозділ ─────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код структурного підрозділу', example: 1, nullable: true })
  facultyId!: number | null;

  @ApiPropertyOptional({
    description: 'Назва структурного підрозділу',
    example: 'Факультет інформаційних технологій',
    nullable: true,
  })
  facultyName!: string | null;

  // ── Відрахування / Академвідпустка ────────────────────────────────

  @ApiPropertyOptional({ description: 'Код причини відрахування', example: 1, nullable: true })
  cancelEducationTypeId!: number | null;

  @ApiPropertyOptional({ description: 'Назва причини відрахування', example: 'За власним бажанням', nullable: true })
  expelEducationTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Код підстави надання академічної відпустки', example: 1, nullable: true })
  academicLeaveTypeId!: number | null;

  @ApiPropertyOptional({
    description: 'Підстава надання академічної/декретної відпустки',
    example: 'За станом здоров\'я',
    nullable: true,
  })
  academicLeaveTypeName!: string | null;

  // ── Професії ─────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Код професії 1', example: 1, nullable: true })
  professionId1!: number | null;

  @ApiPropertyOptional({ description: 'Назва професії 1', example: 'Програміст', nullable: true })
  professionName1!: string | null;

  @ApiPropertyOptional({ description: 'Код професії 2', nullable: true })
  professionId2!: number | null;

  @ApiPropertyOptional({ description: 'Назва професії 2', nullable: true })
  professionName2!: string | null;

  @ApiPropertyOptional({ description: 'Код професії 3', nullable: true })
  professionId3!: number | null;

  @ApiPropertyOptional({ description: 'Назва професії 3', nullable: true })
  professionName3!: string | null;

  @ApiPropertyOptional({ description: 'Код професії 4', nullable: true })
  professionId4!: number | null;

  @ApiPropertyOptional({ description: 'Назва професії 4', nullable: true })
  professionName4!: string | null;

  @ApiPropertyOptional({ description: 'Код професії 5', nullable: true })
  professionId5!: number | null;

  @ApiPropertyOptional({ description: 'Назва професії 5', nullable: true })
  professionName5!: string | null;

  @ApiPropertyOptional({ description: 'Зведена інформація щодо всіх професій', nullable: true })
  professionsInfo!: string | null;

  // ── Додаткові поля ────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Документ про відрахування не поданий (ст. 39)',
    nullable: true,
  })
  isCancelDocumentNotExists!: boolean | null;

  @ApiPropertyOptional({ description: 'Причина поновлення', nullable: true })
  reinstatementReason!: string | null;
}

/** Відповідь: масив видалених записів з історії */
export type StudentEducationHistoryDeletedListResponseDto =
  StudentEducationHistoryDeletedListItemDto[];
