import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class PersonRequestUpdateParamsDto {
  @ApiProperty({ description: 'Код заяви, що редагується' })
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

  @ApiProperty({ description: 'Позначка "Чи підтверджено бажання бути зарахованим за цією заявою на контракт, навіть в разі зарахування за будь-якою іншою на бюджет".             Може змінюватися лише на статусах "допущено" або "допущено (контракт за ріш. ПК)" (вступником у разі електроних заяв).             Може встановлюватися для заяв тільки на контракт на вступні траекторії, за якими є адресне розміщення державного замовлення.             Для інших траекторій передавайте false.             При зарахуванні вступника за заявою відповідних траекторій на навчання за кошти бюджету інші заяви по зазначених траекторіях,             які не матимуть позначки та матимуть на той момент статус "допущено", будуть автоматично скасовані.             Це скасування можливо буде відмінити дією "Анулювання останнього статусу заяви".' })
  @IsBoolean()
  isConfirmedContract!: boolean;

  @ApiPropertyOptional({ description: 'Чи автоматично збільшувати поле "Пріоритет першочерговості" у випадку виявлення заяви на КП вступника з таким самим пріоритетом             Якщо позначка встановлена, у випадку виявлення дублювання пріоритету першочерговості заяви всім заявам, пріоритет першочерговості яких не менший за пріоритет              даної заяви на даній КП буде збільшено пріоритет на 1' })
  @IsBoolean()
  @IsOptional()
  isAutoIncEnrollPriority?: boolean;

}
