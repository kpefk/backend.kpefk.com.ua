import { UserRole } from '@prisma/client'

/** Ролі, що керують опитуваннями (створення, публікація, результати). */
export const SURVEY_MANAGE_ROLES = [
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

/** Межі шкали питання типу RATING. */
export const SURVEY_RATING_MIN = 1
export const SURVEY_RATING_MAX = 5

/** Максимальна кількість питань у кампанії. */
export const SURVEY_MAX_QUESTIONS = 50

/** Максимальна довжина текстової відповіді. */
export const SURVEY_TEXT_ANSWER_MAX_LENGTH = 2000
