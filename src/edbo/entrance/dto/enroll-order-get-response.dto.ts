import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrollOrderGetResponseDto {
  @ApiProperty({ description: 'ID запису наказу', example: 1 })
  orderOfEnrollmentId!: number;

  @ApiPropertyOptional({ description: 'Рік вступної кампанії', example: 2024, nullable: true })
  seasonYear!: number | null;

  @ApiProperty({ description: 'Код закладу освіти', example: 1 })
  universityId!: number;

  @ApiPropertyOptional({ description: 'GUID закладу освіти', example: 'deadbeef-1234-5678-99aa-edeb00edeb00', nullable: true })
  universityCode!: string | null;

  @ApiPropertyOptional({ description: 'Скорочена назва ЗО', example: 'КПІ ім. Сікорського', nullable: true })
  universityShortName!: string | null;

  @ApiProperty({ description: 'Код ЗО, що відображається в наказі', example: 1 })
  displayUniversityId!: number;

  @ApiPropertyOptional({ description: 'Назва ЗО, що відображається в наказі', nullable: true })
  displayUniversityName!: string | null;

  @ApiPropertyOptional({ description: 'Номер наказу', example: '123-з', nullable: true })
  orderOfEnrollmentNumber!: string | null;

  @ApiPropertyOptional({
    description: 'Дата наказу',
    example: '2024-08-30T00:00:00+03:00',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  orderOfEnrollmentDate!: string | null;

  @ApiPropertyOptional({ description: 'Номер протоколу', nullable: true })
  ordersOfEnrollmentsNumberProtocol!: string | null;

  @ApiPropertyOptional({
    description: 'Дата протоколу',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  ordersOfEnrollmentsDateRishenya!: string | null;

  @ApiPropertyOptional({ description: 'Код конкурсної пропозиції', nullable: true })
  universitySpecialitiesId!: number | null;

  @ApiPropertyOptional({ description: 'Чи вибір заяв за конкурсною пропозицією', nullable: true })
  isByUniversitySpeciality!: boolean | null;

  @ApiPropertyOptional({ description: 'Назва конкурсної пропозиції', nullable: true })
  universitySpecialities!: string | null;

  @ApiPropertyOptional({
    description: 'Дата зарахування',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  ordersOfEnrollmentsDatePriyoma!: string | null;

  @ApiPropertyOptional({ description: 'Код типу контингенту', nullable: true })
  ordersOfEnrollmentsStudentsType!: number | null;

  @ApiPropertyOptional({ description: 'Тип контингенту (назва)', nullable: true })
  ordersOfEnrollmentsStudentsTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Освітній ступінь (ОКР)', example: 'Бакалавр', nullable: true })
  qualificationGroupName!: string | null;

  @ApiPropertyOptional({ description: 'Вступ на основі', example: 'Повна загальна середня освіта', nullable: true })
  educationBaseName!: string | null;

  @ApiPropertyOptional({ description: 'Форма навчання', example: 'Денна', nullable: true })
  educationFormName!: string | null;

  @ApiPropertyOptional({ description: 'Курс', example: '1', nullable: true })
  courseName!: string | null;

  @ApiPropertyOptional({ description: 'Структурний підрозділ (скорочена назва)', nullable: true })
  universityFacultetShortName!: string | null;

  @ApiPropertyOptional({ description: 'Структурний підрозділ (повна назва)', nullable: true })
  universityFacultetFullName!: string | null;

  @ApiPropertyOptional({ description: 'Джерело фінансування', example: 'Державний бюджет', nullable: true })
  personEducationPaymentTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Рік бюджету', example: 2024, nullable: true })
  budjetYear!: number | null;

  @ApiPropertyOptional({ description: 'Код джерела фінансування', nullable: true })
  personEducationPaymentTypeId!: number | null;

  @ApiPropertyOptional({ description: 'Код форми навчання', nullable: true })
  educationFormId!: number | null;

  @ApiPropertyOptional({ description: 'Код освітнього ступеню (ОКР)', nullable: true })
  qualificationGroupId!: number | null;

  @ApiPropertyOptional({ description: 'Код вступу на основі', nullable: true })
  educationBaseId!: number | null;

  @ApiPropertyOptional({ description: 'Код курсу', nullable: true })
  courseId!: number | null;

  @ApiPropertyOptional({ description: 'Код структурного підрозділу', nullable: true })
  universityFacultetId!: number | null;

  @ApiProperty({ description: 'КЕП ВО: чи накладено підпис відповідальної особи', example: false })
  isSign!: boolean;

  @ApiProperty({ description: 'КЕП КПЗО: чи накладено підпис керівника та печатки ЗО', example: false })
  isSeal!: boolean;

  @ApiProperty({ description: 'Чи для зарахування заяв за іншими конкурсними пропозиціями', example: false })
  isOtherUnivSpec!: boolean;

  @ApiProperty({ description: 'Чи додатковий конкурсний відбір', example: false })
  isAdditionalContest!: boolean;

  @ApiPropertyOptional({ description: 'Коментар', nullable: true })
  orderOfEnrollmentDescription!: string | null;

  @ApiProperty({ description: 'Чи сформовано картки здобувачів', example: false })
  isConfirmed!: boolean;

  @ApiPropertyOptional({
    description: 'Час останньої зміни',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  orderOfEnrollmentDateLastChange!: string | null;

  @ApiPropertyOptional({ description: 'Особливості зарахування вступників 1', nullable: true })
  showMessage1!: boolean | null;

  @ApiPropertyOptional({ description: 'Особливості зарахування вступників 2', nullable: true })
  showMessage2!: boolean | null;

  @ApiPropertyOptional({ description: 'Особливості зарахування вступників 3', nullable: true })
  showMessage3!: boolean | null;

  @ApiPropertyOptional({ description: 'Особливості зарахування вступників 4', nullable: true })
  showMessage4!: boolean | null;

  @ApiPropertyOptional({ description: 'Особливості зарахування вступників 6', nullable: true })
  showMessage6!: boolean | null;

  @ApiPropertyOptional({ description: 'Місто ЗО', example: 'Київ', nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ description: 'Назва посади особи, що підписує наказ', nullable: true })
  rectorPosition!: string | null;

  @ApiPropertyOptional({ description: 'ПІБ особи, що підписує наказ', nullable: true })
  rectorFIO!: string | null;
}
