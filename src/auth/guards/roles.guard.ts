import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@prisma/client'

import { ROLES_KEY } from '../decorators/roles.decorator'

/**
 * Guard для перевірки ролей користувача.
 */
@Injectable()
export class RolesGuard implements CanActivate {
	/**
	 * Конструктор охоронника ролей.
	 * @param reflector - Рефлектор для отримання метаданих.
	 */
	public constructor(private readonly reflector: Reflector) { }

	/**
	 * Перевіряє, чи має користувач необхідні ролі для доступу до ресурсу.
	 * @param context - Контекст виконання, що містить інформацію про поточний запит.
	 * @returns true, якщо у користувача достатні права; в противному випадку викидає ForbiddenException.
	 * @throws ForbiddenException - Якщо у користувача недостатні права.
	 */
	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass()
		])
		if (!roles) return true

		const request = context.switchToHttp().getRequest<Request & { user?: { role: UserRole } }>()

		if (!request.user) {
			throw new ForbiddenException('Користувач не автентифікований.')
		}

		if (!roles.includes(request.user.role)) {
			throw new ForbiddenException(
				'Недостатньо прав. У вас немає прав доступу до цього ресурсу.'
			)
		}

		return true
	}
}
