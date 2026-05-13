import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrollOrderListItemDto {
  @ApiProperty({ description: 'ID запису наказу', example: 1 })
  orderOfEnrollmentId!: number;

  @ApiProperty({ description: 'Код закладу освіти', example: 1 })
  universityId!: number;

  @ApiPropertyOptional({ description: 'GUID закладу освіти', nullable: true })
  universityCode!: string | null;

  @ApiPropertyOptional({ description: 'Скорочена назва ЗО', example: 'КПІ ім. Сікорського', nullable: true })
  universityShortName!: string | null;

  @ApiPropertyOptional({ description: 'Номер наказу', example: '123-з', nullable: true })
  orderOfEnrollmentNumber!: string | null;

  @ApiPropertyOptional({ description: 'Дата наказу', type: String, format: 'date-time', nullable: true })
  orderOfEnrollmentDate!: string | null;

  @ApiPropertyOptional({ description: 'Номер протоколу', nullable: true })
  ordersOfEnrollmentsNumberProtocol!: string | null;

  @ApiPropertyOptional({ description: 'Дата протоколу', type: String, format: 'date-time', nullable: true })
  ordersOfEnrollmentsDateRishenya!: string | null;

  @ApiPropertyOptional({ description: 'Код конкурсної пропозиції', nullable: true })
  universitySpecialitiesId!: number | null;

  @ApiPropertyOptional({ description: 'Чи вибір заяв за КП', nullable: true })
  isByUniversitySpeciality!: boolean | null;

  @ApiPropertyOptional({ description: 'Назва конкурсної пропозиції', nullable: true })
  universitySpecialities!: string | null;

  @ApiPropertyOptional({ description: 'Кількість заяв у наказі', example: 25, nullable: true })
  requestCount!: number | null;

  @ApiPropertyOptional({ description: 'Дата зарахування', type: String, format: 'date-time', nullable: true })
  ordersOfEnrollmentsDatePriyoma!: string | null;

  @ApiPropertyOptional({ description: 'Код типу контингенту', nullable: true })
  ordersOfEnrollmentsStudentsType!: number | null;

  @ApiPropertyOptional({ description: 'Тип контингенту (назва)', nullable: true })
  ordersOfEnrollmentsStudentsTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Освітній ступінь (ОКР)', example: 'Бакалавр', nullable: true })
  qualificationGroupName!: string | null;

  @ApiPropertyOptional({ description: 'Вступ на основі', nullable: true })
  educationBaseName!: string | null;

  @ApiPropertyOptional({ description: 'Форма навчання', example: 'Денна', nullable: true })
  educationFormName!: string | null;

  @ApiPropertyOptional({ description: 'Курс', example: '1', nullable: true })
  courseName!: string | null;

  @ApiPropertyOptional({ description: 'Структурний підрозділ (скорочена назва)', nullable: true })
  universityFacultetShortName!: string | null;

  @ApiPropertyOptional({ description: 'Структурний підрозділ (повна назва)', nullable: true })
  universityFacultetFullName!: string | null;

  @ApiPropertyOptional({ description: 'Джерело фінансування', nullable: true })
  personEducationPaymentTypeName!: string | null;

  @ApiPropertyOptional({ description: 'Рік бюджету', example: 2024, nullable: true })
  budjetYear!: number | null;

  @ApiProperty({ description: 'КЕП ВО: чи накладено підпис', example: false })
  isSign!: boolean;

  @ApiProperty({ description: 'КЕП КПЗО: чи накладено підпис та печатку', example: false })
  isSeal!: boolean;

  @ApiProperty({ description: 'Чи для зарахування за іншими КП', example: false })
  isOtherUnivSpec!: boolean;

  @ApiProperty({ description: 'Чи додатковий конкурсний відбір', example: false })
  isAdditionalContest!: boolean;

  @ApiPropertyOptional({ description: 'Коментар', nullable: true })
  orderOfEnrollmentDescription!: string | null;

  @ApiProperty({ description: 'Чи сформовано картки здобувачів', example: false })
  isConfirmed!: boolean;

  @ApiPropertyOptional({ description: 'Час останньої зміни', type: String, format: 'date-time', nullable: true })
  orderOfEnrollmentDateLastChange!: string | null;

  @ApiProperty({ description: 'Чи до наказу додані заяви (неможливе видалення)', example: false })
  hasData!: boolean;
}

export type EnrollOrderListResponseDto = EnrollOrderListItemDto[];
