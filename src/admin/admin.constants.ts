import { UserRole } from '@prisma/client'

/**
 * Ролі, акаунтам яких дозволено прив'язувати картку викладача з ЄДЕБО.
 * Керівні ролі теж ведуть заняття / мають кадрову картку, тож потребують зв'язку.
 */
export const TEACHER_LINKABLE_ROLES: readonly UserRole[] = [
	UserRole.TEACHER,
	UserRole.HEAD_OF_DEPARTMENT,
	UserRole.DEPUTY_DIRECTOR,
	UserRole.DIRECTOR,
	UserRole.ADMINISTRATOR
]
