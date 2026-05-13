import { MailerOptions } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'

import { isDev } from '@/libs/common/utils/is-dev.util'

/**
 * Конфігурація для поштового сервера.
 *
 * Ця функція асинхронно витягує параметри конфігурації з ConfigService
 * та формує об'єкт конфігурації для Mailer.
 *
 * @param configService - Сервіс для роботи з конфігурацією прикладання.
 * @returns Об'єкт конфігурації для Mailer.
 */
export const getMailerConfig = async (
	configService: ConfigService
): Promise<MailerOptions> => ({
	transport: {
		host: configService.getOrThrow<string>('MAIL_HOST'),
		port: configService.getOrThrow<number>('MAIL_PORT'),
		secure: !isDev(configService),
		auth: {
			user: configService.getOrThrow<string>('MAIL_LOGIN'),
			pass: configService.getOrThrow<string>('MAIL_PASSWORD')
		}
	},
	defaults: {
		from: `"MyKPEFK" ${configService.getOrThrow<string>('MAIL_LOGIN')}`
	}
})
