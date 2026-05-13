import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'

import { UserService } from '@/user/user.service'

/**
 * Guard для перевірки аутентифікації користувача.
 */
@Injectable()
export class AuthGuard implements CanActivate {
	/**
	 * Конструктор охоронника аутентифікації.
	 * @param userService - Сервіс для роботи з користувачами.
	 */
	public constructor(private readonly userService: UserService) { }

	/**
	 * Перевіряє, чи має користувач доступ до ресурсу.
	 * @param context - Контекст виконання, що містить інформацію про поточний запит.
	 * @returns true, якщо користувач аутентифікований; в противному випадку викидає UnauthorizedException.
	 * @throws UnauthorizedException - Якщо користувач не авторизований.
	 */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & {
      session: { userId?: string }
      user: unknown
    }>()

    if (!request.session.userId) {
      throw new UnauthorizedException(
        'Користувач не авторизований. Будь ласка, увійдіть в систему, щоб отримати доступ.'
      )
    }

    const user = await this.userService.findById(request.session.userId).catch(() => {
      throw new UnauthorizedException(
        'Користувач не авторизований. Будь ласка, увійдіть в систему, щоб отримати доступ.'
      )
    })

    request.user = user

    return true
  }
}
