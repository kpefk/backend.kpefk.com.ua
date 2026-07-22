import { UserRole } from '@prisma/client'

/**
 * Ролі, що керують перезарахуванням кредитів (визнання результатів — академічна
 * функція навчальної частини / екзаменаційної комісії).
 */
export const RECOGNITION_MANAGE_ROLES = [
	UserRole.HEAD_OF_DEPARTMENT,
	UserRole.DEPUTY_DIRECTOR,
	UserRole.DIRECTOR,
	UserRole.ADMINISTRATOR
] as const
