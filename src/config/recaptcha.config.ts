import { ConfigService } from '@nestjs/config'
import { GoogleRecaptchaModuleOptions } from '@nestlab/google-recaptcha'
import type { Request } from 'express'

import { environmentPolicy } from './environment'

/**
 * Конфігурація для Google reCAPTCHA.
 *
 * Ця функція асинхронно витягує параметри конфігурації з ConfigService
 * та формує об'єкт конфігурації для модуля Google reCAPTCHA.
 *
 * @param configService - Сервіс для роботи з конфігурацією прикладання.
 * @returns Об'єкт конфігурації для Google reCAPTCHA.
 */
export const getRecaptchaConfig = (
	configService: ConfigService
): GoogleRecaptchaModuleOptions => ({
	secretKey: configService.getOrThrow<string>('GOOGLE_RECAPTCHA_SECRET_KEY'),
	response: (req: Request) => String(req.headers.recaptcha ?? ''),
	skipIf: !environmentPolicy(configService).enforceRecaptcha
})
