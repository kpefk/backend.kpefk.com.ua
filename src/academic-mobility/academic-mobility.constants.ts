import { UserRole } from '@prisma/client'

/** Ролі, що керують академічною мобільністю (визнання результатів навчання партнера). */
export const MOBILITY_MANAGE_ROLES = [
	UserRole.HEAD_OF_DEPARTMENT,
	UserRole.DEPUTY_DIRECTOR,
	UserRole.DIRECTOR,
	UserRole.ADMINISTRATOR
] as const
