import { Injectable } from "@nestjs/common";
import { StudentEducationsAddParamsDto } from "./dto/student-educations-add-params.dto";
import { StudentEducationsAddResponseDto } from "./dto/student-educations-add-response.dto";
import { StudentEducationHistoryAddDto } from "./dto/student-education-history-add-params.dto";
import { StudentEducationHistoryAddResponseDto } from "./dto/student-education-history-add-response.dto";
import { StudentEducationHistoryDelDto } from "./dto/student-education-history-del-params.dto";
import { StudentEducationHistoryDelResponseDto } from "./dto/student-education-history-del-response.dto";
import { StudentEducationsListForExternalRequestDto } from "./dto/person-educations-list-for-external-params.dto";
import { PersonEducationsListForExternalItemDto } from "./dto/person-educations-list-for-external-response.dto";
import { StudentEducationsUpdateRequestDto } from "./dto/student-educations-update-params.dto";
import { StudentEducationsUpdateResponseDto } from "./dto/student-educations-update-response.dto";
import { EdboService } from "../core/edbo.service";

/**
 * Сервіс для роботи з картками здобувачів освіти через ЄДЕБО API.
 * Інкапсулює всі HTTP-запити до `/api/studentEducations/*`.
 *
 * @see {@link https://edbo.gov.ua} ЄДЕБО — Єдина державна база освіти
 */
@Injectable()
export class StudentEducationsService {
  constructor(private readonly edbo: EdboService) {}

  /**
   * Створення нової картки здобувача освіти.
   *
   * `POST /api/studentEducations/add`
   *
   * @param data - Параметри нової картки здобувача
   * @param data.universityId - Код закладу освіти (**обов'язковий**)
   * @param data.historyTypeId - Код статусу навчання (**обов'язковий**)
   * @param data.dateBegin - Дата "Діє з" статусу навчання (**обов'язковий**)
   * @param data.personId - Код фізичної особи (**обов'язковий**)
   * @param data.educationDateBegin - Дата початку навчання (**обов'язковий**)
   * @param data.educationDateEnd - Дата закінчення навчання (**обов'язковий**)
   * @param data.qualificationGroupId - Код освітнього ступеня (**обов'язковий**)
   * @param data.baseQualificationId - Код вступу на основі (**обов'язковий**)
   * @param data.educationFormId - Код форми навчання (**обов'язковий**)
   * @param data.paymentTypeId - Код джерела фінансування (**обов'язковий**)
   * @param data.isShortTerm - Чи скорочений термін підготовки (**обов'язковий**)
   * @param data.isSecondHigher - Здобуття освіти за іншою спеціальністю (**обов'язковий**)
   * @param data.courseId - Код курсу (**обов'язковий**)
   * @param data.documentEducationId - Код документу вступу (обов'язковий окрім статусу 25)
   * @param data.konkursValue - Конкурсний бал при вступі (діапазон: 0–999999)
   * @returns Код створеної картки та можливі попередження
   *
   * @example
   * const result = await service.add({
   *   universityId: 1,
   *   personId: 123,
   *   historyTypeId: 1,
   *   dateBegin: '2024-09-01T00:00:00+03:00',
   *   educationDateBegin: '2024-09-01T00:00:00+03:00',
   *   educationDateEnd: '2028-06-30T00:00:00+03:00',
   *   qualificationGroupId: 1,
   *   baseQualificationId: 1,
   *   educationFormId: 1,
   *   paymentTypeId: 1,
   *   isShortTerm: false,
   *   isSecondHigher: false,
   *   courseId: 1,
   * });
   * // => { educationId: 456, educationWarning: null }
   */
  async add(
    data: StudentEducationsAddParamsDto
  ): Promise<StudentEducationsAddResponseDto> {
    return this.edbo.post("/api/studentEducations/add", data);
  }

  /**
   * Створення запису в історії картки здобувача.
   *
   * `POST /api/studentEducations/history/add`
   *
   * @param data - Дані нового запису в історії
   * @param data.educationId - Код картки здобувача освіти (**обов'язковий**)
   * @param data.historyTypeId - Код статусу навчання (**обов'язковий**)
   * @param data.dateBegin - Дата "Діє з" статусу навчання (**обов'язковий**)
   * @param data.dateEnd - Дата "Діє по" (для статусів академічних/декретних відпусток)
   * @param data.description - Коментар до статусу
   * @param data.cancelEducationTypeId - Код причини відрахування
   * @param data.academicLeaveTypeId - Код причини академічної відпустки
   * @returns Результат виконання операції
   */
  async addHistory(
    data: StudentEducationHistoryAddDto
  ): Promise<StudentEducationHistoryAddResponseDto> {
    return this.edbo.post("/api/studentEducations/history/add", data);
  }

  /**
   * Видалення запису з історії картки здобувача.
   *
   * `POST /api/studentEducations/history/del`
   *
   * @param data - Параметри запиту
   * @param data.educationId - Код картки здобувача освіти (**обов'язковий**)
   * @returns Результат виконання операції
   *
   * @example
   * await service.deleteHistory({ educationId: 456 });
   */
  async deleteHistory(
    data: StudentEducationHistoryDelDto
  ): Promise<StudentEducationHistoryDelResponseDto> {
    return this.edbo.post("/api/studentEducations/history/del", data);
  }

  /**
   * Перелік записів, видалених з історії картки здобувача.
   *
   * `POST /api/studentEducations/history/deleted/list`
   *
   * @param data - Параметри запиту
   * @param data.educationId - Код картки здобувача освіти (**обов'язковий**)
   * @returns Масив видалених записів з полями `deletedUserPIB`, `deletedDate`,
   * `historyTypeId`, `dateBegin`, `dateEnd`, `specialityId`, `facultyId` тощо
   */
  async getDeletedHistory(
    data: StudentEducationsAddParamsDto
  ): Promise<StudentEducationHistoryDelResponseDto[]> {
    return this.edbo.post("/api/studentEducations/history/deleted/list", data);
  }

  /**
   * Перелік записів в історії картки здобувача.
   *
   * `POST /api/studentEducations/history/list`
   *
   * @param data - Параметри запиту
   * @param data.educationId - Код картки здобувача освіти (**обов'язковий**)
   * @returns Масив записів з полями `educationHistoryId`, `historyTypeId`,
   * `dateBegin`, `dateEnd`, `qualificationGroupId`, `educationFormId`,
   * `paymentTypeId`, `specialityId`, `facultyId`, `cancelEducationTypeId` тощо
   */
  async getHistory(
    data: StudentEducationsAddParamsDto
  ): Promise<StudentEducationHistoryDelResponseDto[]> {
    return this.edbo.post("/api/studentEducations/history/list", data);
  }

  /**
   * Деталізована інформація по картці здобувача.
   *
   * `POST /api/studentEducations/info`
   *
   * @param data - Параметри запиту
   * @param data.educationId - Код картки здобувача освіти (**обов'язковий**)
   * @returns Повні дані картки: особисті дані (`fio`, `birthday`, `rnokpp`),
   * навчальні дати (`educationDateBegin`, `educationDateEnd`, `nextStepDate`),
   * документи (`documentEducationId`, `documentAcademId`),
   * актуальний запис з історії (`hist_*` поля),
   * аудит (`createDate`, `create_userPIB`, `modifyDate`)
   */
  async getInfo(
    data: StudentEducationsAddParamsDto
  ): Promise<StudentEducationsAddResponseDto> {
    return this.edbo.post("/api/studentEducations/info", data);
  }

  /**
   * Картки здобувачів освіти визначеного закладу (з пагінацією).
   *
   * `POST /api/studentEducations/list`
   *
   * @param data - Параметри фільтрації та пагінації
   * @param data.universityId - Код ЗО (**обов'язковий**)
   * @param data.qualificationGroupId - Код освітнього ступеня (**обов'язковий**)
   * @param data.historyFilterId - Фільтр статусів (**обов'язковий**):
   *   `1` — навчаються, `2` — призупинено, `3` — відраховані, `4` — завершили, `-1` — всі
   * @param data.pageNo - Номер сторінки (з 0, за замовчуванням 0)
   * @param data.pageSize - Розмір сторінки (за замовчуванням 20)
   * @param data.sortField - Поле сортування (суфікс ` DESC` для зворотного порядку)
   * @returns Масив зведених даних карток здобувачів
   */
  async getList(
    data: StudentEducationHistoryDelDto
  ): Promise<StudentEducationsAddResponseDto[]> {
    return this.edbo.post("/api/studentEducations/list", data);
  }

  /**
   * Перелік даних здобувачів для зовнішніх систем (з пагінацією).
   *
   * `POST /api/studentEducations/personEducationsList/out`
   *
   * @param data - Параметри запиту
   * @param data.pageNo - Номер сторінки з 0 (**обов'язковий**); 1000 записів/сторінка
   * @param data.fromDate - Фільтр для інкрементальної синхронізації (дата зміни від)
   * @param data.rnokpp - Фільтр: РНОКПП (рядок — може містити провідні нулі)
   * @param data.qualificationGroupId - Фільтр: освітній ступінь (1–10)
   * @param data.isActive - Фільтр: тільки активні
   * @returns Масив даних для зовнішніх систем з ПІБ, РНОКПП, УНЗР,
   * паспортними даними, спеціальністю, формою, фінансуванням та статусом
   */
  async getPersonEducationsListOut(
    data: StudentEducationsListForExternalRequestDto
  ): Promise<PersonEducationsListForExternalItemDto[]> {
    return this.edbo.post(
      "/api/studentEducations/personEducationsList/out",
      data
    );
  }

  /**
   * Категорії спеціальних умов вступу картки здобувача.
   *
   * `POST /api/studentEducations/privilegeCategory/list`
   *
   * @param data - Параметри запиту
   * @param data.educationId - Код картки здобувача освіти (**обов'язковий**)
   * @returns Масив записів з полями `educationPrivilegeCategoryId`,
   * `seasonYear`, `privilegeCategoryId`, `privilegeCategoryName`,
   * `personPrivilegeId`, `modifyUserFio`, `modifyDate`
   */
  async getPrivilegeCategoryList(
    data: StudentEducationsAddParamsDto
  ): Promise<StudentEducationHistoryAddResponseDto[]> {
    return this.edbo.post(
      "/api/studentEducations/privilegeCategory/list",
      data
    );
  }

  /**
   * Редагування картки здобувача.
   *
   * `POST /api/studentEducations/update`
   *
   * Поля, які **не потрібно змінювати**, слід передавати як `null`
   * або взагалі не включати до запиту.
   *
   * @param data - Оновлені дані картки
   * @param data.educationId - Код навчальної картки (**обов'язковий**)
   * @param data.educationDateBegin - Дата початку навчання (**обов'язковий**)
   * @param data.educationDateEnd - Дата закінчення навчання (**обов'язковий**)
   * @param data.previousEducationId - Попереднє навчання (`null` — не змінювати)
   * @param data.universityIdFrom - ЗО переведення (`null` — не змінювати)
   * @param data.groupName - Навчальна група
   * @param data.isDualForm - Дуальна форма навчання
   * @param data.konkursValue - Конкурсний бал
   * @param data.isForPhdRenewal - Для поновлення захисту дисертації (аспірантура)
   * @returns Результат виконання операції
   */
  async updateCardStudent(
    data: StudentEducationsUpdateRequestDto
  ): Promise<StudentEducationsUpdateResponseDto> {
    return this.edbo.post("/api/studentEducations/update", data);
  }
}