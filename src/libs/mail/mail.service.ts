import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { render } from '@react-email/components'

import { EmailChangeTemplate } from './templates/email-change.template'
import { ResetPasswordTemplate } from './templates/reset-password.template'
import { TempPasswordTemplate } from './templates/temp-password.template'
import { TwoFactorAuthTemplate } from './templates/two-factor-auth.template'

/**
 * Service for sending email notifications.
 *
 * This service provides methods for sending different types of email notifications,
 * including mail confirmation, password reset, and two-factor authentication.
 */
@Injectable()
export class MailService {
	/**
	 * Constructor of the mail service.
	 * @param mailerService - Service for working with email sending.
	 * @param configService - Service for working with application configuration.
	 */
	public constructor(
		private readonly mailerService: MailerService,
		private readonly configService: ConfigService
	) { }

	/**
	 * Sends an email for password reset.
	 * @param email - The email address of the recipient.
	 * @param token - The token for password reset.
	 * @returns A promise that resolves when the email is successfully sent.
	 */
	public async sendPasswordResetEmail(email: string, token: string) {
		const domain = this.configService.getOrThrow<string>('ALLOWED_ORIGIN')
		const html = await render(ResetPasswordTemplate({ domain, token }))

		return this.sendMail(email, 'Відновлення паролю', html)
	}

	/**
	 * Sends an email with a two-factor authentication token.
	 * @param email - The email address of the recipient.
	 * @param token - The two-factor authentication token.
	 * @returns A promise that resolves when the email is successfully sent.
	 */
	public async sendTwoFactorTokenEmail(email: string, token: string) {
		const html = await render(TwoFactorAuthTemplate({ token }))

		return this.sendMail(email, 'Підтвердження входу', html)
	}

	/**
	 * Sends an email notification.
	 * @param email - The email address of the recipient.
	 * @param subject - The subject of the email notification.
	 * @param html - The HTML content of the email notification.
	 * @returns A promise that resolves when the email is successfully sent.
	 */
	private sendMail(email: string, subject: string, html: string) {
		return this.mailerService.sendMail({
			to: email,
			subject,
			html
		})
	}

	/**
	 * Sends a confirmation email for an email-address change.
	 * The link points to the backend confirm endpoint and is sent to the NEW
	 * address so that only its owner can complete the change.
	 * @param newEmail - The new email address to confirm.
	 * @param token - The email-change confirmation token.
	 */
	public async sendEmailChangeConfirmation(newEmail: string, token: string) {
		const apiUrl = this.configService.getOrThrow<string>('APPLICATION_URL')
		const confirmUrl = `${apiUrl}/users/email-change/confirm/${token}`
		const html = await render(EmailChangeTemplate({ confirmUrl }))

		return this.sendMail(newEmail, 'Підтвердження зміни email', html)
	}

	/**
	 * Sends an email with a temporary password.
	 * @param email - The email address of the recipient.
	 * @param password - The temporary password.
	 * @returns A promise that resolves when the email is successfully sent.
	 */
	public async sendTempPassword(email: string, password: string) {
		const html = await render(TempPasswordTemplate({ password }))

		return this.sendMail(email, 'Тимчасовий пароль для входу в MyKPEFK', html)
	}
}
