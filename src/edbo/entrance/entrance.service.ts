import { Injectable } from '@nestjs/common';
import { EdboService } from '../core/edbo.service';
import { CancellationAddParamsDto } from './dto/cancellation-add-params.dto';
import { CancellationAddResponseDto } from './dto/cancellation-add-response.dto';
import { CancellationDelParamsDto } from './dto/cancellation-del-params.dto';
import { CancellationListParamsDto } from './dto/cancellation-list-params.dto';
import { CancellationListResponseDto } from './dto/cancellation-list-response.dto';
import { CancellationUpdateParamsDto } from './dto/cancellation-update-params.dto';
import { EnrollOrderGetParamsDto } from './dto/enroll-order-get-params.dto';
import { EnrollOrderGetResponseDto } from './dto/enroll-order-get-response.dto';
import { EnrollOrderListParamsDto } from './dto/enroll-order-list-params.dto';
import { EnrollOrderListResponseDto } from './dto/enroll-order-list-response.dto';
import { ExaminationAddParamsDto } from './dto/examination-add-params.dto';
import { ExaminationCheckParamsDto } from './dto/examination-check-params.dto';
import { ExaminationCheckResponseDto } from './dto/examination-check-response.dto';
import { ExaminationDelParamsDto } from './dto/examination-del-params.dto';
import { PersonRequestCategoryListParamsDto } from './dto/person-request-category-list-params.dto';
import { PersonRequestCategoryListResponseDto } from './dto/person-request-category-list-response.dto';
import { PersonRequestCertificateZNOListParamsDto } from './dto/person-request-certificate-zno-list-params.dto';
import { PersonRequestCertificateZNOListResponseDto } from './dto/person-request-certificate-zno-list-response.dto';
import { PersonRequestChangeEnrollPriorityParamsDto } from './dto/person-request-change-enroll-priority-params.dto';
import { PersonRequestChangeStatusParamsDto } from './dto/person-request-change-status-params.dto';
import { PersonRequestComplexUpdateParamsDto } from './dto/person-request-complex-update-params.dto';
import { PersonRequestEDKIListParamsDto } from './dto/person-request-edki-list-params.dto';
import { PersonRequestEDKIListResponseDto } from './dto/person-request-edki-list-response.dto';
import { PersonRequestList2ParamsDto } from './dto/person-request-list2-params.dto';
import { PersonRequestList2ResponseDto } from './dto/person-request-list2-response.dto';
import { PersonRequestMotivationLetterGetParamsDto } from './dto/person-request-motivation-letter-get-params.dto';
import { PersonRequestMotivationLetterGetResponseDto } from './dto/person-request-motivation-letter-get-response.dto';
import { PersonRequestMotivationLetterSetParamsDto } from './dto/person-request-motivation-letter-set-params.dto';
import { PersonRequestOlympiadsListParamsDto } from './dto/person-request-olympiads-list-params.dto';
import { PersonRequestOlympiadsListResponseDto } from './dto/person-request-olympiads-list-response.dto';
import { PersonRequestOriginalDocumentsUpdateParamsDto } from './dto/person-request-original-documents-update-params.dto';
import { PersonRequestStatusesHistoryParamsDto } from './dto/person-request-statuses-history-params.dto';
import { PersonRequestStatusesHistoryResponseDto } from './dto/person-request-statuses-history-response.dto';
import { PersonRequestSubjectResultListParamsDto } from './dto/person-request-subject-result-list-params.dto';
import { PersonRequestSubjectResultListResponseDto } from './dto/person-request-subject-result-list-response.dto';
import { PersonRequestSubjectResultUpdateParamsDto } from './dto/person-request-subject-result-update-params.dto';
import { PersonRequestSubjectResultUpdateResponseDto } from './dto/person-request-subject-result-update-response.dto';
import { PersonRequestUpdateParamsDto } from './dto/person-request-update-params.dto';
import { PersonRequestZNOListParamsDto } from './dto/person-request-zno-list-params.dto';
import { PersonRequestZNOListResponseDto } from './dto/person-request-zno-list-response.dto';
import { ProgramSpecialityAddParamsDto } from './dto/program-speciality-add-params.dto';
import { ProgramSpecialityDelParamsDto } from './dto/program-speciality-del-params.dto';
import { ProgramSpecialityListParamsDto } from './dto/program-speciality-list-params.dto';
import { ProgramSpecialityListResponseDto } from './dto/program-speciality-list-response.dto';
import { SpecialitiesAddParamsDto } from './dto/specialities-add-params.dto';
import { SpecialitiesDelParamsDto } from './dto/specialities-del-params.dto';
import { SpecialitiesListParamsDto } from './dto/specialities-list-params.dto';
import { SpecialitiesListResponseDto } from './dto/specialities-list-response.dto';
import { SpecialitiesUpdateParamsDto } from './dto/specialities-update-params.dto';
import { EntrySubjectAddParamsDto } from './dto/entry-subject-add-params.dto';
import { EntrySubjectDelParamsDto } from './dto/entry-subject-del-params.dto';
import { EntrySubjectListParamsDto } from './dto/entry-subject-list-params.dto';
import { EntrySubjectListResponseDto } from './dto/entry-subject-list-response.dto';
import { EntrySubjectUpdateParamsDto } from './dto/entry-subject-update-params.dto';
import { UniversityExamAddParamsDto } from './dto/university-exam-add-params.dto';
import { UniversityExamDeleteParamsDto } from './dto/university-exam-delete-params.dto';
import { UniversityExamEditParamsDto } from './dto/university-exam-edit-params.dto';
import { UniversityExamListParamsDto } from './dto/university-exam-list-params.dto';
import { UniversityExamListResponseDto } from './dto/university-exam-list-response.dto';
import { UniversityExamRequestAddParamsDto } from './dto/university-exam-request-add-params.dto';
import { UniversityExamRequestEditStatusParamsDto } from './dto/university-exam-request-edit-status-params.dto';
import { UniversityExamRequestListParamsDto } from './dto/university-exam-request-list-params.dto';
import { UniversityExamRequestListResponseDto } from './dto/university-exam-request-list-response.dto';
import { UniversityExamRequestPhotoParamsDto } from './dto/university-exam-request-photo-params.dto';
import { UniversityExamSpecAddParamsDto } from './dto/university-exam-spec-add-params.dto';
import { UniversityExamSpecDeleteParamsDto } from './dto/university-exam-spec-delete-params.dto';
import { UniversityExamSpecListParamsDto } from './dto/university-exam-spec-list-params.dto';
import { UniversityExamSpecListResponseDto } from './dto/university-exam-spec-list-response.dto';
import { UniversityExamStreamAddParamsDto } from './dto/university-exam-stream-add-params.dto';
import { UniversityExamStreamDeleteParamsDto } from './dto/university-exam-stream-delete-params.dto';
import { UniversityExamStreamEditParamsDto } from './dto/university-exam-stream-edit-params.dto';
import { UniversityExamStreamListParamsDto } from './dto/university-exam-stream-list-params.dto';
import { UniversityExamStreamListResponseDto } from './dto/university-exam-stream-list-response.dto';

/**
 * Сервіс для роботи з вступною кампанією через ЄДЕБО API.
 * Інкапсулює всі HTTP-запити до `/api/entrance/*`.
 *
 * @see {@link https://edbo.gov.ua} ЄДЕБО — Єдина державна база освіти
 */
@Injectable()
export class EntranceService {
  constructor(private readonly edbo: EdboService) {}

  // ── Cancellation (Акти про технічні помилки) ─────────────────────

  /**
   * Перелік актів про технічні помилки.
   *
   * `POST /api/entrance/cancellation/list`
   *
   * @param params - Параметри фільтрації
   * @returns Список актів про технічні помилки
   */
  cancellationList(params: CancellationListParamsDto): Promise<CancellationListResponseDto> {
    return this.edbo.post('/api/entrance/cancellation/list', params);
  }

  /**
   * Створення акту про технічну помилку.
   *
   * `POST /api/entrance/cancellation/add`
   *
   * @param params - Параметри нового акту
   * @returns Об'єкт з ідентифікатором створеного акту `requestCancellationId`
   *
   * @example
   * const result = await service.cancellationAdd({ ... });
   * // => { requestCancellationId: 42 }
   */
  async cancellationAdd(params: CancellationAddParamsDto): Promise<CancellationAddResponseDto> {
    const id = await this.edbo.post<number>('/api/entrance/cancellation/add', params);
    return { requestCancellationId: id };
  }

  /**
   * Оновлення акту про технічну помилку.
   *
   * `POST /api/entrance/cancellation/update`
   *
   * @param params - Оновлені дані акту
   * @returns `true` у разі успішного оновлення
   */
  cancellationUpdate(params: CancellationUpdateParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/cancellation/update', params);
  }

  /**
   * Видалення акту про технічну помилку.
   *
   * `POST /api/entrance/cancellation/del`
   *
   * @param params - Параметри запиту
   * @param params.requestCancellationId - Ідентифікатор акту (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   *
   * @example
   * await service.cancellationDel({ requestCancellationId: 42 });
   */
  cancellationDel(params: CancellationDelParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/cancellation/del', params);
  }

  // ── EnrollOrder (Накази на зарахування) ──────────────────────────

  /**
   * Перелік наказів на зарахування (з пагінацією).
   *
   * `POST /api/entrance/enrollOrder/list`
   *
   * @param params - Параметри фільтрації та пагінації
   * @returns Список наказів на зарахування
   */
  enrollOrderList(params: EnrollOrderListParamsDto): Promise<EnrollOrderListResponseDto> {
    return this.edbo.post('/api/entrance/enrollOrder/list', params);
  }

  /**
   * Деталізована інформація по наказу на зарахування.
   *
   * `POST /api/entrance/enrollOrder/get`
   *
   * @param params - Параметри запиту
   * @param params.enrollOrderId - Ідентифікатор наказу (**обов'язковий**)
   * @returns Повні дані наказу на зарахування
   */
  enrollOrderGet(params: EnrollOrderGetParamsDto): Promise<EnrollOrderGetResponseDto> {
    return this.edbo.post('/api/entrance/enrollOrder/get', params);
  }

  // ── Examination (Приймальні/відбіркові комісії) ───────────────────

  /**
   * Додавання приймальної або відбіркової комісії.
   *
   * `POST /api/entrance/examination/add`
   *
   * @param params - Параметри нової комісії
   * @returns `true` у разі успішного створення
   */
  examinationAdd(params: ExaminationAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/examination/add', params);
  }

  /**
   * Перевірка стану приймальної або відбіркової комісії.
   *
   * `POST /api/entrance/examination/check`
   *
   * @param params - Параметри запиту
   * @returns Результат перевірки стану комісії
   */
  examinationCheck(params: ExaminationCheckParamsDto): Promise<ExaminationCheckResponseDto> {
    return this.edbo.post('/api/entrance/examination/check', params);
  }

  /**
   * Видалення приймальної або відбіркової комісії.
   *
   * `POST /api/entrance/examination/del`
   *
   * @param params - Параметри запиту
   * @param params.examinationId - Ідентифікатор комісії (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   *
   * @example
   * await service.examinationDel({ examinationId: 7 });
   */
  examinationDel(params: ExaminationDelParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/examination/del', params);
  }

  // ── PersonRequest Categories (Категорії заяв вступників) ─────────

  /**
   * Перелік категорій заяв вступників.
   *
   * `POST /api/entrance/personRequest/category/list`
   *
   * @param params - Параметри фільтрації
   * @returns Список категорій заяв вступників
   */
  personRequestCategoryList(
    params: PersonRequestCategoryListParamsDto,
  ): Promise<PersonRequestCategoryListResponseDto> {
    return this.edbo.post('/api/entrance/personRequest/category/list', params);
  }

  // ── PersonRequest (Заяви вступників) ─────────────────────────────

  /**
   * Перелік сертифікатів ЗНО персони.
   *
   * `POST /api/entrance/personRequest/certificateZNO/list`
   *
   * @param params - Параметри запиту
   * @param params.personId - Код фізичної особи (**обов'язковий**)
   * @returns Масив сертифікатів ЗНО з результатами по предметах
   */
  personRequestCertificateZNOList(
    params: PersonRequestCertificateZNOListParamsDto,
  ): Promise<PersonRequestCertificateZNOListResponseDto[]> {
    return this.edbo.post('/api/entrance/personRequest/certificateZNO/list', params);
  }

  /**
   * Змінити черговість у рейтинговому списку для декількох заяв.
   *
   * `POST /api/entrance/personRequest/changeEnrollPriority`
   *
   * @param params - Масив заяв із новими пріоритетами
   * @returns `true` у разі успішного оновлення
   */
  personRequestChangeEnrollPriority(
    params: PersonRequestChangeEnrollPriorityParamsDto,
  ): Promise<boolean> {
    return this.edbo.post('/api/entrance/personRequest/changeEnrollPriority', params);
  }

  /**
   * Зміна статусу заяви вступника.
   *
   * `POST /api/entrance/personRequest/changeStatus`
   *
   * @param params - Параметри зміни статусу
   * @param params.personRequestId - Ідентифікатор заяви (**обов'язковий**)
   * @param params.statusId - Новий статус заяви (**обов'язковий**)
   * @returns `true` у разі успішної зміни статусу
   */
  personRequestChangeStatus(params: PersonRequestChangeStatusParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/personRequest/changeStatus', params);
  }

  /**
   * Редагування усіх складових заяви вступника.
   *
   * `POST /api/entrance/personRequest/complexUpdate`
   *
   * Дозволяє оновити всі пов'язані дані заяви за один запит.
   * Поля, які **не потрібно змінювати**, слід передавати як `null`
   * або не включати до запиту.
   *
   * @param params - Повна структура заяви з оновленими полями
   * @returns `true` у разі успішного оновлення
   */
  personRequestComplexUpdate(params: PersonRequestComplexUpdateParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/personRequest/complexUpdate', params);
  }

  /**
   * Перелік результатів ЄДКІ персони.
   *
   * `POST /api/entrance/personRequest/EDKITechnology/list`
   *
   * @param params - Параметри запиту
   * @param params.personId - Код фізичної особи (**обов'язковий**)
   * @returns Масив результатів ЄДКІ
   */
  personRequestEDKIList(
    params: PersonRequestEDKIListParamsDto,
  ): Promise<PersonRequestEDKIListResponseDto[]> {
    return this.edbo.post('/api/entrance/personRequest/EDKITechnology/list', params);
  }

  /**
   * Отримати перелік заяв вступників для зовнішніх систем (з пагінацією).
   *
   * `POST /api/entrance/personRequest/list2`
   *
   * @param params - Параметри фільтрації та пагінації
   * @param params.pageNo - Номер сторінки з 0 (**обов'язковий**)
   * @returns Масив заяв вступників зі спрощеною структурою для зовнішніх систем
   */
  personRequestList2(
    params: PersonRequestList2ParamsDto,
  ): Promise<PersonRequestList2ResponseDto[]> {
    return this.edbo.post('/api/entrance/personRequest/list2', params);
  }

  /**
   * Отримати текст мотиваційного листа заяви вступника.
   *
   * `POST /api/entrance/personRequest/motivationLetterGet`
   *
   * @param params - Параметри запиту
   * @param params.personRequestId - Ідентифікатор заяви (**обов'язковий**)
   * @returns Текст мотиваційного листа
   */
  personRequestMotivationLetterGet(
    params: PersonRequestMotivationLetterGetParamsDto,
  ): Promise<PersonRequestMotivationLetterGetResponseDto> {
    return this.edbo.post('/api/entrance/personRequest/motivationLetterGet', params);
  }

  /**
   * Редагування тексту мотиваційного листа заяви вступника.
   *
   * `POST /api/entrance/personRequest/motivationLetterSet`
   *
   * @param params - Параметри запиту з оновленим текстом листа
   * @param params.personRequestId - Ідентифікатор заяви (**обов'язковий**)
   * @param params.motivationLetter - Текст мотиваційного листа (**обов'язковий**)
   * @returns `true` у разі успішного оновлення
   */
  personRequestMotivationLetterSet(
    params: PersonRequestMotivationLetterSetParamsDto,
  ): Promise<boolean> {
    return this.edbo.post('/api/entrance/personRequest/motivationLetterSet', params);
  }

  /**
   * Інформація про участь персони в олімпіадах та МАН.
   *
   * `POST /api/entrance/personRequest/olympiads/list`
   *
   * @param params - Параметри запиту
   * @param params.personId - Код фізичної особи (**обов'язковий**)
   * @returns Масив записів про олімпіади та МАН персони
   */
  personRequestOlympiadsList(
    params: PersonRequestOlympiadsListParamsDto,
  ): Promise<PersonRequestOlympiadsListResponseDto[]> {
    return this.edbo.post('/api/entrance/personRequest/olympiads/list', params);
  }

  /**
   * Зміна інформації про виконання вступниками вимог до зарахування,
   * черговості в рейтинговому списку та шифру особової справи.
   *
   * `POST /api/entrance/personRequest/originalDocuments/update`
   *
   * @param params - Оновлені дані про виконання вимог
   * @returns `true` у разі успішного оновлення
   */
  personRequestOriginalDocumentsUpdate(
    params: PersonRequestOriginalDocumentsUpdateParamsDto,
  ): Promise<boolean> {
    return this.edbo.post('/api/entrance/personRequest/originalDocuments/update', params);
  }

  /**
   * Історія статусів заяви вступника.
   *
   * `POST /api/entrance/personRequest/statusesHistory`
   *
   * @param params - Параметри запиту
   * @param params.personRequestId - Ідентифікатор заяви (**обов'язковий**)
   * @returns Масив записів зміни статусів заяви з датами та користувачами
   */
  personRequestStatusesHistory(
    params: PersonRequestStatusesHistoryParamsDto,
  ): Promise<PersonRequestStatusesHistoryResponseDto[]> {
    return this.edbo.post('/api/entrance/personRequest/statusesHistory', params);
  }

  /**
   * Результати вступних випробувань та конкурсних показників заяви.
   *
   * `POST /api/entrance/personRequest/subjectResult/list`
   *
   * @param params - Параметри запиту
   * @param params.personRequestId - Ідентифікатор заяви (**обов'язковий**)
   * @returns Масив результатів вступних випробувань та конкурсних показників
   */
  personRequestSubjectResultList(
    params: PersonRequestSubjectResultListParamsDto,
  ): Promise<PersonRequestSubjectResultListResponseDto[]> {
    return this.edbo.post('/api/entrance/personRequest/subjectResult/list', params);
  }

  /**
   * Редагування результатів вступних випробувань та конкурсних показників.
   *
   * `POST /api/entrance/personRequest/subjectResult/update`
   *
   * > **Увага!** Метод приймає **весь масив** випробувань.
   * > Відсутність випробування в масиві трактується як його **видалення**.
   *
   * @param params - Повний масив результатів вступних випробувань
   * @returns Нове значення конкурсного балу заяви після змін
   */
  personRequestSubjectResultUpdate(
    params: PersonRequestSubjectResultUpdateParamsDto,
  ): Promise<PersonRequestSubjectResultUpdateResponseDto> {
    return this.edbo.post('/api/entrance/personRequest/subjectResult/update', params);
  }

  /**
   * Редагування заяви вступника.
   *
   * `POST /api/entrance/personRequest/update`
   *
   * Поля, які **не потрібно змінювати**, слід передавати як `null`
   * або не включати до запиту.
   *
   * @param params - Оновлені дані заяви
   * @param params.personRequestId - Ідентифікатор заяви (**обов'язковий**)
   * @returns `true` у разі успішного оновлення
   */
  personRequestUpdate(params: PersonRequestUpdateParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/personRequest/update', params);
  }

  /**
   * Перелік результатів ЄВІ/ЄФВВ персони.
   *
   * `POST /api/entrance/personRequest/ZNOTechnology/list`
   *
   * @param params - Параметри запиту
   * @param params.personId - Код фізичної особи (**обов'язковий**)
   * @returns Масив результатів ЄВІ/ЄФВВ
   */
  personRequestZNOList(
    params: PersonRequestZNOListParamsDto,
  ): Promise<PersonRequestZNOListResponseDto[]> {
    return this.edbo.post('/api/entrance/personRequest/ZNOTechnology/list', params);
  }

  // ── ProgramSpeciality (Освітні програми/спеціалізації конкурсної пропозиції) ──

  /**
   * Додавання освітньої програми або спеціалізації до конкурсної пропозиції.
   *
   * `POST /api/entrance/programspeciality/add`
   *
   * @param params - Параметри нової освітньої програми/спеціалізації
   * @returns `true` у разі успішного додавання
   */
  programSpecialityAdd(params: ProgramSpecialityAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/programspeciality/add', params);
  }

  /**
   * Видалення освітньої програми або спеціалізації конкурсної пропозиції.
   *
   * `POST /api/entrance/programspeciality/del`
   *
   * @param params - Параметри запиту
   * @param params.programSpecialityId - Ідентифікатор освітньої програми/спеціалізації (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   */
  programSpecialityDel(params: ProgramSpecialityDelParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/programspeciality/del', params);
  }

  /**
   * Перелік освітніх програм та спеціалізацій конкурсної пропозиції.
   *
   * `POST /api/entrance/programspeciality/list`
   *
   * @param params - Параметри фільтрації
   * @returns Масив освітніх програм та спеціалізацій конкурсної пропозиції
   */
  programSpecialityList(
    params: ProgramSpecialityListParamsDto,
  ): Promise<ProgramSpecialityListResponseDto[]> {
    return this.edbo.post('/api/entrance/programspeciality/list', params);
  }

  // ── Specialities (Конкурсні пропозиції) ──────────────────────────

  /**
   * Додавання конкурсної пропозиції.
   *
   * `POST /api/entrance/specialities/add`
   *
   * @param params - Параметри нової конкурсної пропозиції
   * @returns `true` у разі успішного додавання
   */
  specialitiesAdd(params: SpecialitiesAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/specialities/add', params);
  }

  /**
   * Видалення конкурсної пропозиції.
   *
   * `POST /api/entrance/specialities/del`
   *
   * @param params - Параметри запиту
   * @param params.specialityId - Ідентифікатор конкурсної пропозиції (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   */
  specialitiesDel(params: SpecialitiesDelParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/specialities/del', params);
  }

  /**
   * Перелік конкурсних пропозицій закладу освіти.
   *
   * `POST /api/entrance/specialities/list`
   *
   * @param params - Параметри фільтрації
   * @param params.universityId - Код закладу освіти (**обов'язковий**)
   * @returns Масив конкурсних пропозицій закладу
   */
  specialitiesList(params: SpecialitiesListParamsDto): Promise<SpecialitiesListResponseDto[]> {
    return this.edbo.post('/api/entrance/specialities/list', params);
  }

  /**
   * Редагування конкурсної пропозиції.
   *
   * `POST /api/entrance/specialities/update`
   *
   * Поля, які **не потрібно змінювати**, слід передавати як `null`
   * або не включати до запиту.
   *
   * @param params - Оновлені дані конкурсної пропозиції
   * @returns `true` у разі успішного оновлення
   */
  specialitiesUpdate(params: SpecialitiesUpdateParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/specialities/update', params);
  }

  // ── EntrySubject (Вступні випробування та конкурсні показники) ────

  /**
   * Додавання вступного випробування або конкурсного показника.
   *
   * `POST /api/entrance/specialities/entrysubject/add`
   *
   * @param params - Параметри нового вступного випробування
   * @returns `true` у разі успішного додавання
   */
  entrySubjectAdd(params: EntrySubjectAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/specialities/entrysubject/add', params);
  }

  /**
   * Видалення вступного випробування або конкурсного показника.
   *
   * `POST /api/entrance/specialities/entrysubject/del`
   *
   * @param params - Параметри запиту
   * @param params.entrySubjectId - Ідентифікатор вступного випробування (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   */
  entrySubjectDel(params: EntrySubjectDelParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/specialities/entrysubject/del', params);
  }

  /**
   * Перелік вступних випробувань та конкурсних показників конкурсної пропозиції.
   *
   * `POST /api/entrance/specialities/entrysubject/list`
   *
   * @param params - Параметри фільтрації
   * @returns Масив вступних випробувань та конкурсних показників
   */
  entrySubjectList(params: EntrySubjectListParamsDto): Promise<EntrySubjectListResponseDto[]> {
    return this.edbo.post('/api/entrance/specialities/entrysubject/list', params);
  }

  /**
   * Редагування вступного випробування або конкурсного показника.
   *
   * `POST /api/entrance/specialities/entrysubject/update`
   *
   * @param params - Оновлені дані вступного випробування
   * @returns `true` у разі успішного оновлення
   */
  entrySubjectUpdate(params: EntrySubjectUpdateParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/specialities/entrysubject/update', params);
  }

  // ── UniversityExams (Вступні випробування закладу освіти) ─────────

  /**
   * Створення запису про проведення вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/add`
   *
   * @param params - Параметри нового запису про вступне випробування
   * @returns `true` у разі успішного створення
   */
  universityExamAdd(params: UniversityExamAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/add', params);
  }

  /**
   * Вилучення запису про проведення вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/delete`
   *
   * @param params - Параметри запиту
   * @param params.universityExamId - Ідентифікатор запису (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   */
  universityExamDelete(params: UniversityExamDeleteParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/delete', params);
  }

  /**
   * Редагування запису про проведення вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/edit`
   *
   * @param params - Оновлені дані запису про вступне випробування
   * @returns `true` у разі успішного оновлення
   */
  universityExamEdit(params: UniversityExamEditParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/edit', params);
  }

  /**
   * Перелік записів про проведення вступних випробувань закладом освіти.
   *
   * `POST /api/entrance/universityExams/list`
   *
   * @param params - Параметри фільтрації
   * @param params.universityId - Код закладу освіти (**обов'язковий**)
   * @returns Масив записів про вступні випробування
   */
  universityExamList(
    params: UniversityExamListParamsDto,
  ): Promise<UniversityExamListResponseDto[]> {
    return this.edbo.post('/api/entrance/universityExams/list', params);
  }

  // ── UniversityExams → Requests (Заяви на участь у вступному випробуванні) ──

  /**
   * Створення заяви на участь у вступному випробуванні в закладі освіти.
   *
   * `POST /api/entrance/universityExams/requests/add`
   *
   * @param params - Параметри нової заяви на участь у вступному випробуванні
   * @returns `true` у разі успішного створення
   */
  universityExamRequestAdd(params: UniversityExamRequestAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/requests/add', params);
  }

  /**
   * Редагування статусу заяви на участь у вступному випробуванні в закладі освіти.
   *
   * `POST /api/entrance/universityExams/requests/editStatus`
   *
   * @param params - Параметри зміни статусу заяви
   * @param params.requestId - Ідентифікатор заяви (**обов'язковий**)
   * @param params.statusId - Новий статус заяви (**обов'язковий**)
   * @returns `true` у разі успішного оновлення
   */
  universityExamRequestEditStatus(
    params: UniversityExamRequestEditStatusParamsDto,
  ): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/requests/editStatus', params);
  }

  /**
   * Перелік заяв на участь у вступному випробуванні в закладі освіти.
   *
   * `POST /api/entrance/universityExams/requests/list`
   *
   * @param params - Параметри фільтрації
   * @returns Масив заяв на участь у вступному випробуванні
   */
  universityExamRequestList(
    params: UniversityExamRequestListParamsDto,
  ): Promise<UniversityExamRequestListResponseDto[]> {
    return this.edbo.post('/api/entrance/universityExams/requests/list', params);
  }

  /**
   * Завантаження фото заяви на участь у вступному випробуванні в закладі освіти.
   *
   * `POST /api/entrance/universityExams/requests/photo`
   *
   * @param params - Параметри запиту з даними фото
   * @param params.requestId - Ідентифікатор заяви (**обов'язковий**)
   * @returns `true` у разі успішного завантаження
   */
  universityExamRequestPhoto(params: UniversityExamRequestPhotoParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/requests/photo', params);
  }

  // ── UniversityExams → Specs (Конкурсні пропозиції вступних випробувань) ──

  /**
   * Додавання прив'язки конкурсної пропозиції до запису про проведення
   * вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/specs/add`
   *
   * @param params - Параметри нової прив'язки
   * @returns `true` у разі успішного додавання
   */
  universityExamSpecAdd(params: UniversityExamSpecAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/specs/add', params);
  }

  /**
   * Вилучення прив'язки конкурсної пропозиції до запису про проведення
   * вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/specs/delete`
   *
   * @param params - Параметри запиту
   * @param params.specId - Ідентифікатор прив'язки (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   */
  universityExamSpecDelete(params: UniversityExamSpecDeleteParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/specs/delete', params);
  }

  /**
   * Перелік конкурсних пропозицій, прив'язаних до запису про проведення
   * вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/specs/list`
   *
   * @param params - Параметри фільтрації
   * @returns Масив прив'язаних конкурсних пропозицій
   */
  universityExamSpecList(
    params: UniversityExamSpecListParamsDto,
  ): Promise<UniversityExamSpecListResponseDto[]> {
    return this.edbo.post('/api/entrance/universityExams/specs/list', params);
  }

  // ── UniversityExams → Streams (Потоки вступних випробувань) ───────

  /**
   * Створення потоку у записі про проведення вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/streams/add`
   *
   * @param params - Параметри нового потоку
   * @returns `true` у разі успішного створення
   */
  universityExamStreamAdd(params: UniversityExamStreamAddParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/streams/add', params);
  }

  /**
   * Вилучення потоку у записі про проведення вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/streams/delete`
   *
   * @param params - Параметри запиту
   * @param params.streamId - Ідентифікатор потоку (**обов'язковий**)
   * @returns `true` у разі успішного видалення
   */
  universityExamStreamDelete(params: UniversityExamStreamDeleteParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/streams/delete', params);
  }

  /**
   * Редагування потоку у записі про проведення вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/streams/edit`
   *
   * @param params - Оновлені дані потоку
   * @returns `true` у разі успішного оновлення
   */
  universityExamStreamEdit(params: UniversityExamStreamEditParamsDto): Promise<boolean> {
    return this.edbo.post('/api/entrance/universityExams/streams/edit', params);
  }

  /**
   * Перелік потоків у записі про проведення вступного випробування закладом освіти.
   *
   * `POST /api/entrance/universityExams/streams/list`
   *
   * @param params - Параметри фільтрації
   * @returns Масив потоків вступного випробування
   */
  universityExamStreamList(
    params: UniversityExamStreamListParamsDto,
  ): Promise<UniversityExamStreamListResponseDto[]> {
    return this.edbo.post('/api/entrance/universityExams/streams/list', params);
  }
}