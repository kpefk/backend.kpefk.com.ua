import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import { ProviderOptionsSymbol, TypeOptions } from './provider.constants'
import { BaseOAuthService } from './services/base-oauth.service'

/**
 * Сервіс для управління провайдерами OAuth.
 */
@Injectable()
export class ProviderService implements OnModuleInit {
	/**
	 * Конструктор сервісу провайдерів.
	 *
	 * @param options - Опції провайдера, що містять базовий URL та сервіси.
	 */
	public constructor(
		@Inject(ProviderOptionsSymbol) private readonly options: TypeOptions
	) { }

	/**
	 * Ініціалізує модуль.
	 *
	 * Встановлює базовий URL для всіх сервісів провайдерів.
	 */
	public onModuleInit(): void {
		for (const provider of this.options.services) {
			provider.baseUrl = this.options.baseUrl
		}
	}

	/**
	 * Знаходить сервіс провайдера по назві.
	 *
	 * @param service - Назва сервісу провайдера.
	 * @returns Сервіс провайдера або null, якщо не знайдено.
	 */
	public findByService(service: string): BaseOAuthService | null {
		return this.options.services.find(s => s.name === service) ?? null
	}
}
