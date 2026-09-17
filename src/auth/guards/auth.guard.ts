import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { UserService } from '@/user/user.service'

import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

/**
 * Guard for checking user authentication.
 */
@Injectable()
export class AuthGuard implements CanActivate {
	/**
	 * Constructor of the authentication guard.
	 * @param userService - Service for user operations.
	 * @param reflector - Reflector for reading the `@Public()` metadata.
	 */
	public constructor(
		private readonly userService: UserService,
		private readonly reflector: Reflector
	) {}

	/**
	 * Checks if the user has access to the resource.
	 * @param context - Execution context containing information about the current request.
	 * @returns true, if the user is authenticated; otherwise throws UnauthorizedException.
	 * @throws UnauthorizedException if the user is not authenticated.
	 */
	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()]
		)
		if (isPublic) return true

		const request = context.switchToHttp().getRequest<
			Request & {
				session: { userId?: string }
				user: unknown
			}
		>()

		// Цей guard виконується двічі на захищених роутах: спершу глобально
		// (APP_GUARD), потім ще раз через @Authorization() на контролері.
		// Якщо глобальний прохід уже підвантажив користувача — не робимо
		// другий запит до БД на кожен запит.
		if (request.user) return true

		if (!request.session.userId) {
			throw new UnauthorizedException(
				'Користувач не авторизований. Будь ласка, увійдіть в систему, щоб отримати доступ.'
			)
		}

		const user = await this.userService
			.findById(request.session.userId)
			.catch(() => {
				throw new UnauthorizedException(
					'Користувач не авторизований. Будь ласка, увійдіть в систему, щоб отримати доступ.'
				)
			})

		request.user = user

		return true
	}
}
