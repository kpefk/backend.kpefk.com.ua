import { ConfigService } from '@nestjs/config'
import * as dotenv from 'dotenv'

// Завантажує змінні середовища з файлу .env
dotenv.config()

/**
 * Перевіряє, чи знаходиться додаток в режимі розробки.
 * @param configService - Сервіс конфігурації.
 * @returns true, якщо режим розробки; інакше false.
 */
export const isDev = (configService: ConfigService): boolean =>
	configService.getOrThrow('NODE_ENV') === 'development'

/**
 * Визначає, чи працює додаток в режимі розробки.
 */
export const IS_DEV_ENV = process.env.NODE_ENV === 'development'
