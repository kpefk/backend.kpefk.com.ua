import {
	CanActivate,
	ExecutionContext,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { Request } from 'express'

import { ProviderService } from '../provider/provider.service'

/**
 * Guard для перевірки наявності провайдера аутентифікації.
 */
@Injectable()
export class AuthProviderGuard implements CanActivate {
	/**
	 * Конструктор охоронника провайдера аутентифікації.
	 * @param providerService - Сервіс для роботи з провайдерами аутентифікації.
	 */
	public constructor(private readonly providerService: ProviderService) {}

	/**
	 * Перевіряє, чи існує вказаний провайдер аутентифікації.
	 * @param context - Контекст виконання, що містить інформацію про поточний запит.
	 * @returns true, якщо провайдер знайдений; в противному випадку викидає NotFoundException.
	 * @throws NotFoundException - Якщо провайдер не знайдений.
	 */
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const provider = request.params.provider as string

    const providerInstance = this.providerService.findByService(provider)

    if (!providerInstance) {
      throw new NotFoundException(
        `Провайдер "${provider}" не знайдений. Будь ласка, перевірте правильність введених даних.`
      )
    }

    return true
  }
}
