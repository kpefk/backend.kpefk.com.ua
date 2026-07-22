import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'

import { UserService } from '@/user/user.service'

/**
 * Guard for checking user authentication.
 */
@Injectable()
export class AuthGuard implements CanActivate {
	/**
	 * Constructor of the authentication guard.
	 * @param userService - Service for user operations.
	 */
	public constructor(private readonly userService: UserService) {}

	/**
	 * Checks if the user has access to the resource.
	 * @param context - Execution context containing information about the current request.
	 * @returns true, if the user is authenticated; otherwise throws UnauthorizedException.
	 * @throws UnauthorizedException if the user is not authenticated.
	 */
	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<
			Request & {
				session: { userId?: string }
				user: unknown
			}
		>()

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
