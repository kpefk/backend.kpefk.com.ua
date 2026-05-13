import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { render } from '@react-email/components'

import { ResetPasswordTemplate } from './templates/reset-password.template'
import { TempPasswordTemplate } from './templates/temp-password.template'
import { TwoFactorAuthTemplate } from './templates/two-factor-auth.template'

/**
 * Сервіс для відправки Email-повідомлень.
 *
 * Цей сервіс надає методи для відправки різних типів email-повідомлень,
 * включаючи підтвердження пошти, скидання пароля та двофакторну аутентифікацію.
 */
@Injectable()
export class MailService {
	/**
	 * Конструктор сервісу пошти.
	 * @param mailerService - Сервіс для роботи з відправкою email.
	 * @param configService - Сервіс для роботи з конфігурацією додатку.
	 */
	public constructor(
		private readonly mailerService: MailerService,
		private readonly configService: ConfigService
	) { }

	/**
	 * Відправляє email для скидання пароля.
	 * @param email - Адреса електронної пошти одержувача.
	 * @param token - Токен для скидання пароля.
	 * @returns Проміс, який дозволяється при успішній відправці.
	 */
	public async sendPasswordResetEmail(email: string, token: string) {
		const domain = this.configService.getOrThrow<string>('ALLOWED_ORIGIN')
		const html = await render(ResetPasswordTemplate({ domain, token }))

		return this.sendMail(email, 'Відновлення паролю', html)
	}

	/**
	 * Відправляє email з токеном двофакторної аутентифікації.
	 * @param email - Адреса електронної пошти одержувача.
	 * @param token - Токен двофакторної аутентифікації.
	 * @returns Проміс, який дозволяється при успішній відправці.
	 */
	public async sendTwoFactorTokenEmail(email: string, token: string) {
		const html = await render(TwoFactorAuthTemplate({ token }))

		return this.sendMail(email, 'Підтвердження входу', html)
	}

	/**
	 * Відправляє email-повідомлення.
	 * @param email - Адреса електронної пошти одержувача.
	 * @param subject - Тема email-повідомлення.
	 * @param html - HTML-вміст email-повідомлення.
	 * @returns Проміс, який дозволяється при успішній відправці.
	 */
	private sendMail(email: string, subject: string, html: string) {
		return this.mailerService.sendMail({
			to: email,
			subject,
			html
		})
	}

	/**
	 * Відправляє email з тимчасовим паролем.
	 * @param email - Адреса електронної пошти одержувача.
	 * @param password - Тимчасовий пароль.
	 * @returns Проміс, який дозволяється при успішній відправці.
	 */
	public async sendTempPassword(email: string, password: string) {
		const html = await render(TempPasswordTemplate({ password }))

		return this.sendMail(email, 'Тимчасовий пароль для входу в MyKPEFK', html)
	}
}
