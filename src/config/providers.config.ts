import { ConfigService } from '@nestjs/config'

import { TypeOptions } from '@/auth/provider/provider.constants'
import { GoogleProvider } from '@/auth/provider/services/google.provider'

/**
 * Конфігурація для провайдерів OAuth.
 *
 * Ця функція асинхронно витягує параметри конфігурації з ConfigService
 * та формує об'єкт конфігурації для OAuth провайдерів.
 *
 * @param configService - Сервіс для роботи з конфігурацією прикладання.
 * @returns Об'єкт конфігурації для провайдерів OAuth.
 */
export const getProvidersConfig = async (
	configService: ConfigService
): Promise<TypeOptions> => ({
	baseUrl: configService.getOrThrow<string>('APPLICATION_URL'),
	services: [
		new GoogleProvider({
			client_id: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
			client_secret: configService.getOrThrow<string>(
				'GOOGLE_CLIENT_SECRET'
			),
			scopes: ['email', 'profile']
		})
	]
})
