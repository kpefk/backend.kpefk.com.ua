import { UserRole } from '@prisma/client'

/** Ролі, що керують опитуваннями (створення, публікація, результати). */
export const SURVEY_MANAGE_ROLES = [
	UserRole.HEAD_OF_DEPARTMENT,
	UserRole.DEPUTY_DIRECTOR,
	UserRole.DIRECTOR,
	UserRole.ADMINISTRATOR
] as const

/** Межі шкали питання типу RATING (зірки). */
export const SURVEY_RATING_MIN = 1
export const SURVEY_RATING_MAX = 5

/** Допустимі межі для налаштовуваної лінійної шкали (SCALE). */
export const SCALE_MIN_ALLOWED = 1
export const SCALE_MAX_ALLOWED = 10

/** Максимальна кількість питань у кампанії. */
export const SURVEY_MAX_QUESTIONS = 50

/** Максимальна кількість варіантів відповіді у choice-питанні. */
export const SURVEY_MAX_OPTIONS = 20

/** Максимальна довжина текстової відповіді. */
export const SURVEY_TEXT_ANSWER_MAX_LENGTH = 2000
