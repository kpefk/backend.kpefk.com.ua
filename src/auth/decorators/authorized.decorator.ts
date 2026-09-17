import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { User } from '@prisma/client'

/**
 * Decorator for getting the authenticated user from the request context.
 *
 * This decorator allows you to extract user data from the request object.
 * If a parameter is specified, it returns a specific user property;
 * otherwise, it returns the entire user object.
 *
 * @param data - Name of the user property to extract.
 * @param ctx - Execution context containing information about the current request.
 * @returns Value of the user property or the entire user object.
 */
export const Authorized = createParamDecorator(
	(data: keyof User | undefined, ctx: ExecutionContext) => {
		// AuthGuard кладе сюди користувача ще до виконання handler'а.
		const request = ctx.switchToHttp().getRequest<{ user: User }>()
		const user = request.user

		return data ? user[data] : user
	}
)
