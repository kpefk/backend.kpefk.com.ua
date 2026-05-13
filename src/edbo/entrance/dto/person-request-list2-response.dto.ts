import { ApiPropertyOptional } from '@nestjs/swagger';

export class PersonRequestList2ResponseDto {
  @ApiPropertyOptional({ description: 'Код заяви' })
  personRequestId?: string | null;

  @ApiPropertyOptional({ description: 'Код фізичної особи' })
  personId?: string | null;

  @ApiPropertyOptional({ description: 'Код документу на основі якого відбувається вступ' })
  personDocumentId?: string | null;

  @ApiPropertyOptional({ description: 'Код конкурсної пропозиції' })
  universitySpecialitiesId?: string | null;

  @ApiPropertyOptional({ description: 'Чи електронна заява, що подана з кабінету вступника ПЗСО' })
  isEz?: boolean | null;

  @ApiPropertyOptional({ description: 'ПІБ вступника' })
  fIO?: string | null;

  @ApiPropertyOptional({ description: 'Дата народження вступника' })
  birthday?: Date | null;

  @ApiPropertyOptional({ description: 'Стать вступника' })
  personSexName?: string | null;

  @ApiPropertyOptional({ description: 'Ід громадянства вступника (див. довідник PHYS_Country)' })
  countryId?: number | null;

  @ApiPropertyOptional({ description: 'Статус заяви' })
  personRequestStatusTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Ід статуса заяви' })
  personRequestStatusTypeId?: string | null;

  @ApiPropertyOptional({ description: 'Конкурсний бал' })
  konkursValue?: number | null;

  @ApiPropertyOptional({ description: 'Пріоритет заяви' })
  requestPriority?: number | null;

  @ApiPropertyOptional({ description: 'Черговість в рейтинговому списку, серед вступників з однаковим конкурсним балом (черговість за мотиваційним листом)' })
  enrollPriority?: number | null;

  @ApiPropertyOptional({ description: 'Допуск до конкурсу (0=тільки контракт; 1=тільки бюджет; 2=бюджет та контракт)' })
  enrollLevel?: number | null;

  @ApiPropertyOptional({ description: 'Тип конкурсу за яким отримано рекомендацію на бюджет' })
  budgetRecommendationTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Тип конкурсу за яким отримано рекомендацію на контракт' })
  contractRecommendationTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Особа, що претендує на зарахування на навчання на підставі отриманої позитивної оцінки співбесіди (творчого конкурсу) отримала позитивну оцінку' })
  isInterviewSuccess?: boolean | null;

  @ApiPropertyOptional({ description: 'Виконано вимоги до зарахування' })
  isOriginalDocumentsAdded?: boolean | null;

  @ApiPropertyOptional({ description: 'Виконано вимоги до зарахування (параллельне здобуття освіти)' })
  informationOriginalDocumentLocation?: boolean | null;

  @ApiPropertyOptional({ description: 'Категорія заяви іноземця' })
  foreignTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Причина скасування' })
  cancellationDescription?: string | null;

  @ApiPropertyOptional({ description: 'Чи вступник претендує на бюджет' })
  isClaimForBudget?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи вступник претендує на контракт' })
  isClaimForContract?: boolean | null;

  @ApiPropertyOptional({ description: 'Освітній ступінь(рівень) за кошти державного або місцевого бюджету' })
  isBudgetEducation?: number | null;

  @ApiPropertyOptional({ description: 'Чи є право безоплатно здобувати освіту за другою спеціальністю' })
  isAnotherBudgetAllowed?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи вступ на ту ж саму або споріднену в межах галузі знань спеціальність' })
  isSimiliarSpeciality?: boolean | null;

  @ApiPropertyOptional({ description: 'Особа здобуває вищий ступінь (рівень) вищої освіти не менше одного року та виконує у повному обсязі індивідуальний навчальний план' })
  isGraduateOneYear?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи потрібно пройти додаткові вступні випробування' })
  isAdditionalExam?: boolean | null;

  @ApiPropertyOptional({ description: 'Тип документу, на основі якого відбувається вступ' })
  documentTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Серія документу, на основі якого відбувається вступ' })
  documentSeries?: string | null;

  @ApiPropertyOptional({ description: 'Номер документу, на основі якого відбувається вступ' })
  documentNumbers?: string | null;

  @ApiPropertyOptional({ description: 'Дата видачі документу, на основі якого відбувається вступ' })
  documentDateGet?: Date | null;

  @ApiPropertyOptional({ description: 'Ким видано документ, на основі якого відбувається вступ' })
  documentIssued?: string | null;

  @ApiPropertyOptional({ description: 'Ід відзнаки документа, на основі якого відбувається вступ (див. довідник PHYS_AwardTypes)' })
  documentAwardTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Спосіб виготовлення (джерело походження) документу, на основі якого відбувається вступ' })
  documentSourceTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Час додання заяви в ЄДЕБО' })
  dateCreate?: Date | null;

  @ApiPropertyOptional({ description: 'Чи в заяві змінено бали за результатами апеляцій ЗНО, потрібно внести зміни в документацію' })
  needUpdateZNO?: boolean | null;

  @ApiPropertyOptional({ description: 'Ід типу конкурсу за яким отримано рекомендацію на бюджет за результатом адресного розміщення державного замовлення' })
  algRecommendationTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Пріоритет заяви, яка отримала рекомендацію за результатом адресного розміщення державного замовлення' })
  algPriorityAccepted?: number | null;

  @ApiPropertyOptional({ description: 'Час останньої зміни' })
  dateLastChange?: Date | null;

  @ApiPropertyOptional({ description: 'Ід користувача, що додав заяву (окрім електроних заяв)' })
  createUserId?: number | null;

  @ApiPropertyOptional({ description: 'Користувач, що додав заяву (окрім електроних заяв)' })
  addUserFio?: string | null;

  @ApiPropertyOptional({ description: 'Ід акту про допущену технічну помилку' })
  requestCancellationId?: number | null;

  @ApiPropertyOptional({ description: 'Ід наказу про зарахування' })
  orderOfEnrollmentId?: number | null;

  @ApiPropertyOptional({ description: '' })
  dateRegistration?: Date | null;

  @ApiPropertyOptional({ description: 'Телефон вступника (з електроного кабінету)' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Адреса e-mail вступника (з електроного кабінету)' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Ід ПІБ особи' })
  personNameId?: number | null;

  @ApiPropertyOptional({ description: 'Унікальний код особи' })
  personCodeU?: string | null;

  @ApiPropertyOptional({ description: 'Шифр (номер) особової справи' })
  personalCode?: string | null;

  @ApiPropertyOptional({ description: '(для електроних заяв) Вступник зазначив, що претендує на додаткові бали за успішно закінчені підготовчі курси закладу у рік вступу' })
  isPretendFDP?: boolean | null;

  @ApiPropertyOptional({ description: '(для електроних заяв) Список через кому пільгових категорій (довідник ENT_PersonSpecialCategory), які вступник зазначив' })
  ezIsPretendList?: string | null;

  @ApiPropertyOptional({ description: '(для електроних заяв) Вступник зазанчив зарахувати додаткові бали до оцінки з предмету сертифікату ЗНО для випробування з цим Ід, оскільки є учасником Всеукраїнської олімпіади для професійної орієнтації закладу вищої освіти' })
  additionalScoreUSSPretendId?: number | null;

  @ApiPropertyOptional({ description: 'Причина допуску лише на контракт (див. довідник ENT_ContractReason)' })
  contractReasonId?: number | null;

  @ApiPropertyOptional({ description: 'Позначка "Чи підтверджено бажання бути зарахованим за цією заявою на контракт, навіть в разі зарахування за будь-якою іншою на бюджет".             Може змінюватися лише на статусах "допущено" або "допущено (контракт за ріш. ПК)" (вступником у разі електроних заяв).             Може встановлюватися для заяв на вступні траекторії, за якими є адресне розміщення державного замовлення.             При зарахуванні вступника за заявою відповідних траекторій на навчання за кошти бюджету інші заяви по зазначених траекторіях,             які не матимуть позначки та матимуть на той момент статус "допущено", будуть автоматично деактивовані.             Також будуть деактивовані заяви рекомендовані на бюджет на інших траєкторіях.             Цю деактивацію можливо буде відмінити дією "Анулювання останнього статусу заяви".' })
  isConfirmedContract?: boolean | null;

  @ApiPropertyOptional({ description: 'Вступник підтвердив вибір місця навчання за цією заявою наклавши КЕП' })
  isSignedDecision?: boolean | null;

  @ApiPropertyOptional({ description: 'Дата накладання КЕП вступником щодо підтвердження вибор місця навчання за цією заявою' })
  signDateDecision?: Date | null;

  @ApiPropertyOptional({ description: 'Вступник підтвердив вибір місця навчання за цією заявою завантаживши сканкопію підписаної власноруч заяви' })
  isSignedDecisionByFile?: boolean | null;

  @ApiPropertyOptional({ description: 'Дата завантаження сканкопії вступником щодо підтвердження вибор місця навчання за цією заявою' })
  signDecisionFileDate?: Date | null;

}
