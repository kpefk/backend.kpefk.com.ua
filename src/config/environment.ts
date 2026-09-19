import type { ConfigService } from '@nestjs/config'
import * as dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Тіри розгортання та їхні політики.
 *
 * Раніше код був бінарним — `isDev()` або «не dev», — тож будь-яке значення
 * NODE_ENV, відмінне від 'development', трактувалось як production. Для тіра
 * `test` це означало найгірший із можливих наборів: реальні записи в ЄДЕБО,
 * увімкнена reCAPTCHA, вимкнений Swagger і проігнорований .env-файл.
 *
 * Тепер поведінку задає явна матриця політик. Додаючи новий прапорець,
 * дописуй його одразу для всіх трьох тірів — `Record<AppEnvironment, …>`
 * не дасть забути жодного.
 */
export type AppEnvironment = 'development' | 'test' | 'production'

export interface EnvironmentPolicy {
	/**
	 * Чи дозволені write-операції до ЄДЕБО.
	 *
	 * Лише production. ЄДЕБО — державний реєстр (ст. 74 Закону № 2145-VIII),
	 * і запис у нього з dev або staging означає псування реальних даних про
	 * здобувачів. Перемикача немає свідомо: це не налаштування, а запобіжник.
	 */
	readonly allowEdboWrites: boolean
	/** Swagger-документація API. Закрита в production, щоб не світити поверхню API. */
	readonly exposeSwagger: boolean
	/** Перевірка reCAPTCHA на публічних формах. */
	readonly enforceRecaptcha: boolean
	/** TLS для SMTP. Вимкнений лише локально (зазвичай mailhog/maildev без TLS). */
	readonly secureMailTransport: boolean
	/** Чи є короткий SESSION_SECRET/COOKIES_SECRET фатальною помилкою, а не попередженням. */
	readonly enforceStrongSecrets: boolean
	/** Послаблений CSP — потрібен, щоб працював Swagger UI. */
	readonly relaxContentSecurityPolicy: boolean
}

const POLICIES: Record<AppEnvironment, EnvironmentPolicy> = {
	development: {
		allowEdboWrites: false,
		exposeSwagger: true,
		enforceRecaptcha: false,
		secureMailTransport: false,
		enforceStrongSecrets: false,
		relaxContentSecurityPolicy: true
	},
	test: {
		// Staging працює на копії реальних даних і з реальними обліковими
		// даними ЄДЕБО — записи заборонені так само жорстко, як і в dev.
		allowEdboWrites: false,
		exposeSwagger: true,
		enforceRecaptcha: false,
		// Staging ходить у справжній SMTP, тож TLS обов'язковий. Щоб листи не
		// розліталися реальним здобувачам, MAIL_* має вказувати на тестову скриньку.
		secureMailTransport: true,
		enforceStrongSecrets: true,
		relaxContentSecurityPolicy: true
	},
	production: {
		allowEdboWrites: true,
		exposeSwagger: false,
		enforceRecaptcha: true,
		secureMailTransport: true,
		enforceStrongSecrets: true,
		relaxContentSecurityPolicy: false
	}
}

const VALID: readonly AppEnvironment[] = ['development', 'test', 'production']

function isAppEnvironment(value: unknown): value is AppEnvironment {
	return typeof value === 'string' && VALID.includes(value as AppEnvironment)
}

/**
 * Визначає тір до завантаження env-файлів.
 *
 * Пріоритет — змінна процесу (так задає тір оркестратор або npm-скрипт).
 * Якщо її немає, зазираємо в базовий `.env`, не застосовуючи його: локально
 * NODE_ENV історично живе саме там.
 */
function detectEnvironment(): AppEnvironment {
	if (isAppEnvironment(process.env.NODE_ENV)) return process.env.NODE_ENV

	const basePath = resolve(process.cwd(), '.env')
	if (existsSync(basePath)) {
		// `processEnv: {}` — розбір без запису в process.env.
		const parsed = dotenv.config({
			path: basePath,
			processEnv: {},
			quiet: true
		}).parsed
		if (isAppEnvironment(parsed?.NODE_ENV)) return parsed.NODE_ENV
	}

	// Безпечний дефолт: найсуворіший тір, який нічого не пише в ЄДЕБО.
	return 'development'
}

export const APP_ENV: AppEnvironment = detectEnvironment()

/**
 * Вантажить env-файли тіра в `process.env`: спершу `.env.<tier>`, потім базовий
 * `.env`. Перший файл виграє — значення тіра перекривають спільні.
 *
 * Викликається один раз при імпорті модуля, тобто до того, як NestJS збере
 * метадані модулів. Саме тому ConfigModule може працювати з `ignoreEnvFile: true`
 * однаково в усіх тірах: файли вже застосовані тут.
 *
 * У production файлів зазвичай немає — змінні приходять від оркестратора,
 * і виклик стає no-op.
 */
function loadEnvFiles(): void {
	const candidates = [`.env.${APP_ENV}`, '.env']
		.map(name => resolve(process.cwd(), name))
		.filter(existsSync)

	if (candidates.length === 0) return
	dotenv.config({ path: candidates, quiet: true })
}

loadEnvFiles()

// NODE_ENV має бути в process.env до валідації схеми: коли тір визначено
// з файлу, у самому процесі змінної могло не бути.
process.env.NODE_ENV = APP_ENV

/** Політика поточного тіра. Доступна ще до старту DI-контейнера. */
export const APP_POLICY: EnvironmentPolicy = POLICIES[APP_ENV]

/**
 * Політика за станом ConfigService — для провайдерів, які конфігуруються
 * через DI (mailer, recaptcha). Значення те саме, що й у `APP_POLICY`;
 * окрема функція існує, щоб фабрики лишались тестованими через підміну
 * ConfigService.
 */
export function environmentPolicy(
	configService: ConfigService
): EnvironmentPolicy {
	const value = configService.get<string>('NODE_ENV')
	return POLICIES[isAppEnvironment(value) ? value : APP_ENV]
}

/** Поточний тір за станом ConfigService. */
export function appEnvironment(configService: ConfigService): AppEnvironment {
	const value = configService.get<string>('NODE_ENV')
	return isAppEnvironment(value) ? value : APP_ENV
}
