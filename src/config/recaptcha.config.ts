import { ConfigService } from '@nestjs/config'
import { GoogleRecaptchaModuleOptions } from '@nestlab/google-recaptcha'

import { isDev } from '@/libs/common/utils/is-dev.util'

/**
 * Конфігурація для Google reCAPTCHA.
 *
 * Ця функція асинхронно витягує параметри конфігурації з ConfigService
 * та формує об'єкт конфігурації для модуля Google reCAPTCHA.
 *
 * @param configService - Сервіс для роботи з конфігурацією прикладання.
 * @returns Об'єкт конфігурації для Google reCAPTCHA.
 */
export const getRecaptchaConfig = async (
	configService: ConfigService
): Promise<GoogleRecaptchaModuleOptions> => ({
	secretKey: configService.getOrThrow<string>('GOOGLE_RECAPTCHA_SECRET_KEY'),
	response: req => req.headers.recaptcha,
	skipIf: isDev(configService)
})
