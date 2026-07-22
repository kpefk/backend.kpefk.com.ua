import {
	CanActivate,
	ExecutionContext,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { Request } from 'express'

import { ProviderService } from '../provider/provider.service'

/**
 * Guard for checking the existence of an authentication provider.
 */
@Injectable()
export class AuthProviderGuard implements CanActivate {
	/**
	 * Constructor of the provider authentication guard.
	 * @param providerService - Сервіс для роботи з провайдерами аутентифікації.
	 */
	public constructor(private readonly providerService: ProviderService) {}

	/**
	 * Checks if the specified authentication provider exists.
	 * @param context - Execution context containing information about the current request.
	 * @returns true if the provider is found; otherwise throws NotFoundException.
	 * @throws NotFoundException if the provider is not found.
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
