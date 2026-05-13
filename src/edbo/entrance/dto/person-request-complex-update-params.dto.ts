import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class PersonRequestComplexUpdateParamsDto {
  @ApiProperty({ description: 'ІД заяви, оновлення якої виконується' })
  @IsString()
  personRequestId!: string;

  @ApiPropertyOptional({ description: 'Категорія іноземця. Довідник значень можна отримати методом api/dictionary/get з LookupKey = CDC_ForeignType' })
  @IsString()
  @IsOptional()
  foreignTypeId?: string;

  @ApiProperty({ description: 'Здобуває ступінь(рівень) або вищий ступінь(рівень) не менше одного року та виконує у повному обсязі індивідуальний навчальний план' })
  @IsBoolean()
  isGraduateOneYear!: boolean;

  @ApiProperty({ description: 'Потрібно пройти додаткові вступні випробування' })
  @IsBoolean()
  isAdditionalExam!: boolean;

  @ApiPropertyOptional({ description: 'Черговість в рейтинговому списку, серед вступників з однаковим конкурсним балом' })
  @IsInt()
  @IsOptional()
  enrollPriority?: number;

  @ApiProperty({ description: 'Претендує на участь в конкурсі на бюджет' })
  @IsBoolean()
  isClaimForBudget!: boolean;

  @ApiProperty({ description: 'Претендує на участь в конкурсі на контракт' })
  @IsBoolean()
  isClaimForContract!: boolean;

  @ApiProperty({ description: 'Освітній ступінь (рівень) за кошти державного або місцевого бюджету:                                            1 = "ніколи не здобувався"                                            2 = "вже здобутий раніше"                                            3 = "вже здобувався раніше (навчання не завершено)"' })
  @IsInt()
  isBudgetEducation!: number;

  @ApiProperty({ description: 'Право безоплатно здобувати освіту за другою спеціальністю' })
  @IsBoolean()
  isAnotherBudgetAllowed!: boolean;

  @ApiProperty({ description: 'Вступ на ту ж саму або споріднену в межах галузі знань спеціальність' })
  @IsBoolean()
  isSimiliarSpeciality!: boolean;

  @ApiPropertyOptional({ description: 'Результат співбесіди: 1 = "рекомендовано", 0 = "не рекомендовано"' })
  @IsBoolean()
  @IsOptional()
  isInterviewSuccess?: boolean;

  @ApiProperty({ description: 'Подано оригінали документів' })
  @IsBoolean()
  isOriginalDocumentsAdded!: boolean;

  @ApiProperty({ description: 'Подано довідку про місце знаходження оригіналів документів' })
  @IsBoolean()
  informationOriginalDocumentLocation!: boolean;

  @ApiPropertyOptional({ description: 'Номер (шифр) особової справи, максимум 32 символи' })
  @IsString()
  @IsOptional()
  personalCode?: string;

  @ApiPropertyOptional({ description: 'Перелік категорій заяви' })
  @IsString()
  @IsOptional()
  personRequestCategoryList?: string;

  @ApiPropertyOptional({ description: 'Результати вступних випробувань та комплексних показників' })
  @IsString()
  @IsOptional()
  subjectResult?: string;

  @ApiPropertyOptional({ description: 'Історія статусів заяви' })
  @IsString()
  @IsOptional()
  personRequestStatusesHistory?: string;

  @ApiPropertyOptional({ description: 'Перелік даних, які потребують уточнення та спосіб їх подання' })
  @IsString()
  @IsOptional()
  delayDescription?: string;

  @ApiPropertyOptional({ description: 'Допущено до участі в конкурсі:2 - бюджет та контракт;1 - тільки бюджет;0 - тільки контракт' })
  @IsInt()
  @IsOptional()
  enrollLevel?: number;

  @ApiPropertyOptional({ description: 'Причина відмови, до статусу 7 "Відмова"' })
  @IsString()
  @IsOptional()
  denyDescription?: string;

  @ApiPropertyOptional({ description: 'Код акту про допущену технічну помилку, до статусу 8 "Скасовано (ЗО)"' })
  @IsInt()
  @IsOptional()
  requestCancellationId?: number;

  @ApiPropertyOptional({ description: 'Опис причини скасування, до статусу 8 "Скасовано (ЗО)"' })
  @IsString()
  @IsOptional()
  cancellationDescription?: string;

  @ApiPropertyOptional({ description: 'Тип конкурсу за яким отримано рекомендацію на бюджет, до статусу 9 "Рекомендовано(бюджет)"' })
  @IsInt()
  @IsOptional()
  budgetRecommendationTypeId?: number;

  @ApiPropertyOptional({ description: 'Причина відхилення, до статусу 10 "Відхилено (бюджет)"' })
  @IsString()
  @IsOptional()
  budgetRejectDescription?: string;

  @ApiPropertyOptional({ description: 'Тип конкурсу за яким отримано рекомендацію на контракт, до статусу 12 "Рекомендовано(контракт)"' })
  @IsInt()
  @IsOptional()
  contractRecommendationTypeId?: number;

  @ApiPropertyOptional({ description: 'Причина відхилення, до статусу 13 "Відхилено (контракт)"' })
  @IsString()
  @IsOptional()
  contractRejectDescription?: string;

  @ApiPropertyOptional({ description: 'Код наказу про зарахування, до статусу 14 "До наказу"' })
  @IsInt()
  @IsOptional()
  orderOfEnrollmentId?: number;

  @ApiPropertyOptional({ description: 'Час та місце проведення творчого конкурсу, до статусу 5 "Зареєстровано"' })
  @IsString()
  @IsOptional()
  registrationDescryption?: string;

  @ApiPropertyOptional({ description: 'Причина відрахування' })
  @IsInt()
  @IsOptional()
  cancelCauseTypeId?: number;

  @ApiPropertyOptional({ description: 'Причина допуску лише на контракт' })
  @IsInt()
  @IsOptional()
  contractReasonId?: number;

  @ApiPropertyOptional({ description: 'Чи перевести статус не зважаючи на те, що до заявки прив`язано недіючий документ вступника, до статусу 14 "До наказу"' })
  @IsBoolean()
  @IsOptional()
  isIgnoreBadDocument?: boolean;

  @ApiPropertyOptional({ description: 'Чи користувач підтверджує, що ознайомлений з тим, що виконання дії викличе автоматичну ануляцію інших заяв вступника на контракт, до статусу 14 "До наказу"' })
  @IsBoolean()
  @IsOptional()
  isAcknowledgeOtherContractCancels?: boolean;

  @ApiPropertyOptional({ description: 'Позначка "Чи підтверджено бажання бути зарахованим за цією заявою на контракт, навіть в разі зарахування за будь-якою іншою на бюджет".             Може змінюватися лише на статусах "допущено" або "допущено (контракт за ріш. ПК)" (вступником у разі електроних заяв).             Може встановлюватися для заяв тільки на контракт на вступні траекторії, за якими є адресне розміщення державного замовлення.             Для інших траекторій передавайте false.             При зарахуванні вступника за заявою відповідних траекторій на навчання за кошти бюджету інші заяви по зазначених траекторіях,             які не матимуть позначки та матимуть на той момент статус "допущено", будуть автоматично скасовані.             Це скасування можливо буде відмінити дією "Анулювання останнього статусу заяви".' })
  @IsBoolean()
  @IsOptional()
  isConfirmedContract?: boolean;

}
