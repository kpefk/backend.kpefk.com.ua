import { applyDecorators, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'

import { AuthGuard } from '../guards/auth.guard'
import { RolesGuard } from '../guards/roles.guard'

import { Roles } from './roles.decorator'

/**
 * Декоратор для авторизації користувачів з певними ролями.
 *
 * Цей декоратор застосовує захист на основі ролей та аутентифікації.
 * Якщо вказані ролі, застосовується також декоратор Roles.
 *
 * @param roles - Масив ролей, для яких потрібен доступ.
 * @returns Декоратори, що застосовуються до методу або класу.
 */
export function Authorization(...roles: UserRole[]) {
	if (roles.length > 0) {
		return applyDecorators(
			Roles(...roles),
			UseGuards(AuthGuard, RolesGuard)
		)
	}

	return applyDecorators(UseGuards(AuthGuard))
}
