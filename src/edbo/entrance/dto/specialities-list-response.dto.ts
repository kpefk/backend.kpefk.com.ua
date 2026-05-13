import { ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialitiesListResponseDto {
  @ApiPropertyOptional({ description: 'Ід конкурсної пропозиції' })
  universitySpecialitiesId?: number | null;

  @ApiPropertyOptional({ description: 'Ід ЗО' })
  universityId?: number | null;

  @ApiPropertyOptional({ description: 'Ід структурного підрозділу' })
  universityFacultetId?: number | null;

  @ApiPropertyOptional({ description: 'Назва структурного підрозділу (повна)' })
  universityFacultetFullName?: string | null;

  @ApiPropertyOptional({ description: 'Назва КП' })
  universitySpecialitiesName?: string | null;

  @ApiPropertyOptional({ description: 'Назва КП (англійською)' })
  universitySpecialitiesNameEng?: string | null;

  @ApiPropertyOptional({ description: 'Освітній ступінь' })
  qualificationGroupId?: number | null;

  @ApiPropertyOptional({ description: 'Назва освітнього ступеню' })
  qualificationGroupName?: string | null;

  @ApiPropertyOptional({ description: 'Ід комісії' })
  entranceExaminationId?: number | null;

  @ApiPropertyOptional({ description: 'Назва комісії' })
  entranceExaminationName?: string | null;

  @ApiPropertyOptional({ description: 'Ід вступ на основі' })
  educationBaseId?: number | null;

  @ApiPropertyOptional({ description: 'Вступ на основі' })
  educationBaseName?: string | null;

  @ApiPropertyOptional({ description: 'Ід спеціальності' })
  specialityId?: number | null;

  @ApiPropertyOptional({ description: 'Назва спеціальності' })
  specialityName?: string | null;

  @ApiPropertyOptional({ description: 'Код спеціальності за класифікатором' })
  specialityCode?: string | null;

  @ApiPropertyOptional({ description: 'Повна назва спеціальності із кодом' })
  specialityFullName?: string | null;

  @ApiPropertyOptional({ description: 'Ід редакції довідника спеціальностей' })
  redactionId?: number | null;

  @ApiPropertyOptional({ description: 'Ід спеціалізації' })
  specializationId?: number | null;

  @ApiPropertyOptional({ description: 'Назва спеціалізації' })
  specializationName?: string | null;

  @ApiPropertyOptional({ description: 'Код спеціалізації за класифікатором' })
  specializationCode?: string | null;

  @ApiPropertyOptional({ description: 'Повна назва спеціалізації із кодом' })
  specializationFullName?: string | null;

  @ApiPropertyOptional({ description: 'Ід форми навчання' })
  educationFormId?: number | null;

  @ApiPropertyOptional({ description: 'Форма навчання' })
  educationFormName?: string | null;

  @ApiPropertyOptional({ description: 'Ід курсу зарахування' })
  courseId?: number | null;

  @ApiPropertyOptional({ description: 'Курс зарахування' })
  courseName?: string | null;

  @ApiPropertyOptional({ description: 'Чи скорочений термін навчання' })
  isShortDuration?: boolean | null;

  @ApiPropertyOptional({ description: 'Термін навчання (повністю)' })
  durationEducation?: string | null;

  @ApiPropertyOptional({ description: 'Термін навчання (років)' })
  durationEducationYear?: number | null;

  @ApiPropertyOptional({ description: 'Термін навчання (місяців)' })
  durationEducationMonth?: number | null;

  @ApiPropertyOptional({ description: 'Дата поч. навчання' })
  educationDateBegin?: Date | null;

  @ApiPropertyOptional({ description: 'Дата зак. навчання' })
  educationDateEnd?: Date | null;

  @ApiPropertyOptional({ description: 'Рік закіннчення навчання' })
  educationDateEndYear?: number | null;

  @ApiPropertyOptional({ description: 'Чи здобуття ступеня за іншою спеціальністю' })
  isSecondEducation?: number | null;

  @ApiPropertyOptional({ description: 'Чи можуть навчатися іноземці' })
  canForeign?: boolean | null;

  @ApiPropertyOptional({ description: 'Дата вибору освітньої програми' })
  eDUProgramChooseDate?: Date | null;

  @ApiPropertyOptional({ description: 'Вартість навчання за рік (контракт)' })
  educationPrice?: number | null;

  @ApiPropertyOptional({ description: 'Ід валюти вартості навчання' })
  currencyId?: number | null;

  @ApiPropertyOptional({ description: 'Валюта вартості навчання' })
  currencyName?: string | null;

  @ApiPropertyOptional({ description: 'Ід типу (вид) КП' })
  universitySpecialitiesTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Тип (вид) КП' })
  universitySpecialitiesTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Максимальний обсяг державного замовлення' })
  maxOrder?: number | null;

  @ApiPropertyOptional({ description: 'Максимальний обсяг державного замовлення, квота 1' })
  maxOrderQ1?: number | null;

  @ApiPropertyOptional({ description: 'Максимальний обсяг державного замовлення, квота 2' })
  maxOrderQ2?: number | null;

  @ApiPropertyOptional({ description: 'Кваліфікаційний мінімум державного замовлення' })
  minOrder?: number | null;

  @ApiPropertyOptional({ description: 'Обсяг державного (регіонального) замовлення' })
  order?: number | null;

  @ApiPropertyOptional({ description: 'Загальний обсяг державного (регіонального) замовлення' })
  totalOrder?: number | null;

  @ApiPropertyOptional({ description: 'Обсяг державного замовлення, квота 1' })
  orderQ1?: number | null;

  @ApiPropertyOptional({ description: 'Обсяг державного замовлення, квота 2' })
  orderQ2?: number | null;

  @ApiPropertyOptional({ description: 'Обсяг державного замовлення, квота іноземців' })
  orderForeign?: number | null;

  @ApiPropertyOptional({ description: 'Обсяги на контракт' })
  orderContract?: number | null;

  @ApiPropertyOptional({ description: 'Виділена частина ліцензованого обсягу' })
  orderLicense?: number | null;

  @ApiPropertyOptional({ description: 'Використовувати пріоритетність заяв' })
  isUsePriority?: boolean | null;

  @ApiPropertyOptional({ description: 'Дата оголошення першого списку рекомендованих на загальних умовах' })
  announceRecListDate?: Date | null;

  @ApiPropertyOptional({ description: 'Початок прийому заяв' })
  personRequestDateStart?: Date | null;

  @ApiPropertyOptional({ description: 'Закінчення прийому заяв' })
  personRequestDateEnd?: Date | null;

  @ApiPropertyOptional({ description: 'Чи анульовано за результатом адресного розміщення державного (регіонального) замовлення' })
  isAlgCanceled?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи підтверджено внесення конкурсної пропозиції' })
  isApplied?: boolean | null;

  @ApiPropertyOptional({ description: 'Час першого успішного внесення конкурсної пропозиції' })
  applyDate?: Date | null;

  @ApiPropertyOptional({ description: 'Чи потребує внесення державним (регіональним) замовником' })
  needApprove?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи внесено обсяги державного (регіонального) замовлення' })
  hasOrder?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи внесено максимальні обсяги державного (регіонального) замовлення' })
  hasMaxOrder?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи потребує узгодження обсягів державного (регіонального) замовлення' })
  needChangeOrder?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи потребує узгодження максимальних обсягів державного (регіонального) замовлення' })
  needChangeMaxOrder?: boolean | null;

  @ApiPropertyOptional({ description: 'Час останніх змін, внесених ДЗ' })
  dateLastSCChange?: Date | null;

  @ApiPropertyOptional({ description: 'Час останньої зміни' })
  dateLastChange?: Date | null;

  @ApiPropertyOptional({ description: 'Освітні програми' })
  programNames?: string | null;

  @ApiPropertyOptional({ description: 'Дата завершення розподілу у вступній кампанії обсягів на бюджет' })
  distributeBudgetOrderEndDate?: Date | null;

  @ApiPropertyOptional({ description: 'Дата завершення розподілу у вступній кампанії обсягів на контракт' })
  distributeNonBudgetOrderEndDate?: Date | null;

  @ApiPropertyOptional({ description: 'Ід типу освітньої програми' })
  masterProgramTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Тип освітньої програми' })
  masterProgramTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Тип освітньої програми (скорочено)' })
  masterProgramTypeShortName?: string | null;

  @ApiPropertyOptional({ description: 'Ід особливого вступу' })
  specialEntryTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Особливий вступ' })
  specialEntryTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Особливий вступ (скорочено)' })
  specialEntryTypeShortName?: string | null;

  @ApiPropertyOptional({ description: 'Чи для спеціалізації передбачені обсяги державного (регіонального) замволення' })
  isAllowDz?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи ліцензована спеціальність' })
  isLicSpecialization?: boolean | null;

  @ApiPropertyOptional({ description: 'Ід результату перевірки на наявність виділених держзамовником обсягів' })
  orderBlockedTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Результат перевірки на наявність виділених держзамовником обсягів' })
  orderBlockedTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Чи вступ на цю спеціальність (спеціалізацію) та освітній ступінь має особливу підтримку' })
  isSpecialSupport?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи вступ на цю спеціальність (спеціалізацію) та освітній ступінь передбачає складання ЄВІ/ЄФВВ' })
  isMasterFullZno?: boolean | null;

  @ApiPropertyOptional({ description: 'Ід Регіональне замовлення від' })
  regionGovernanceTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Регіональне замовлення від' })
  regionGovernanceTypeName?: string | null;

  @ApiPropertyOptional({ description: 'Чи для відкритої КП існує запис про відсутність широких обсягів державного замовлення для поточної вступної кампанії' })
  noGlobalOrder?: boolean | null;

  @ApiPropertyOptional({ description: 'Загальна вартість за повний термін навчання розраховується автоматично' })
  isCountEducationAllTermPrice?: boolean | null;

  @ApiPropertyOptional({ description: 'Загальна вартість за повний термін навчання' })
  educationAllTermPrice?: number | null;

  @ApiPropertyOptional({ description: 'Для перезарахування кредитів ECTS' })
  forEctsTransfer?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи акредитовані всі освітні програми конкурсної пропозиції' })
  isAccredited?: boolean | null;

  @ApiPropertyOptional({ description: 'Код КП ЗО правонаступника' })
  universitySpecialitiesTransferId?: number | null;

  @ApiPropertyOptional({ description: 'Дата та час публікації результатів адресного розміщення' })
  algEndTime?: Date | null;

}
