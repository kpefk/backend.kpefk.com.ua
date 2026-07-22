import { UserRole } from '@prisma/client'

/** Ролі, що бачать звіти вступної кампанії. */
export const ADMISSIONS_MANAGE_ROLES = [
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

/** Місяці активної вступної кампанії — вікно для cron-синхронізації (черв–вер). */
export const CAMPAIGN_MONTHS: readonly number[] = [6, 7, 8, 9]

/** Розмір сторінки при пагінації ЄДЕБО-запитів. */
export const EDBO_PAGE_SIZE = 100

/** Статус заяви ЄДЕБО «Заява надійшла з сайту» — джерело для авто-реєстрації. */
export const SITE_STATUS_ID = '1'

/** Статус заяви ЄДЕБО «Зареєстровано» — ціль авто-реєстрації. */
export const REGISTERED_STATUS_TYPE_ID = 5

/** Період тіку планувальника частого ресинку (мс). Реальний інтервал — з налаштувань кампанії. */
export const AUTO_POLL_TICK_MS = 15_000

/**
 * ПД-поля заяви, що вичищаються при архівації року (set NULL).
 * Ключі відповідають колонкам `AdmissionApplication`. Звітні поля тут відсутні —
 * вони зберігаються завжди.
 */
export const APPLICATION_PII_FIELDS = [
  'fio',
  'birthday',
  'personSexName',
  'phone',
  'email',
  'documentTypeId',
  'documentSeries',
  'documentNumbers',
  'documentIssued',
  'documentDateGet',
  'personalCode',
  'entryEduDocSeries',
  'entryEduDocNumber',
  'entryEduDocIssued',
  'entryEduDocDateGet',
] as const
