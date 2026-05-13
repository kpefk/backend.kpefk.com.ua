import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { User } from '@prisma/client'

/**
 * Декоратор для отримання авторизованого користувача з контексту запиту.
 *
 * Цей декоратор дозволяє витягувати дані користувача з об'єкта запиту.
 * Якщо вказано параметр, повертає конкретне властивість користувача,
 * інакше повертає весь об'єкт користувача.
 *
 * @param data - Ім'я властивості користувача, яке потрібно витягти.
 * @param ctx - Контекст виконання, що містить інформацію про поточний запит.
 * @returns Значення властивості користувача або весь об'єкт користувача.
 */
export const Authorized = createParamDecorator(
	(data: keyof User, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
		const user = request.user

		return data ? user[data] : user
	}
)
