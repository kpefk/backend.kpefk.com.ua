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
 * Guard for checking user roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
	/**
	 * Constructor of the roles guard.
	 * @param reflector - Reflector for getting metadata.
	 */
	public constructor(private readonly reflector: Reflector) {}

	/**
	 * Checks if the user has the required roles to access the resource.
	 * @param context - Execution context containing information about the current request.
	 * @returns true if the user has sufficient rights; otherwise throws ForbiddenException.
	 * @throws ForbiddenException if the user does not have sufficient rights.
	 */
	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass()
		])
		if (!roles) return true

		const request = context
			.switchToHttp()
			.getRequest<Request & { user?: { role: UserRole } }>()

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
