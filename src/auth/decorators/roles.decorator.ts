import { SetMetadata } from '@nestjs/common'
import { UserRole } from '@prisma/client'

export const ROLES_KEY = 'roles'

/**
 * Декоратор для встановлення метаданих ролей.
 *
 * Цей декоратор дозволяє вказати ролі, необхідні для доступу до методу або класу.
 *
 * @param roles - Масив ролей, які повинні бути встановлені в метаданих.
 * @returns Функція SetMetadata, що встановлює ролі в метаданих.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
