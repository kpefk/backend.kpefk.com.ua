import { z } from 'zod'

// Побічний ефект імпорту: `environment` застосовує env-файли тіра
// (`.env.<tier>`, потім базовий `.env`) у process.env. Порядок критичний —
// ConfigModule.forRoot() валідує process.env уже в момент обчислення метаданих
// модуля. Прив'язка саме до цього файлу гарантована семантикою ES-модулів:
// app.module.ts імпортує звідси `envSchema`, тож тіло цього модуля — а з ним і
// завантаження файлів — виконається раніше за forRoot().
import './environment'

/**
 * Схема валідації змінних оточення.
 *
 * Навіщо: усі змінні читаються через `configService.getOrThrow(...)`, тобто
 * відсутній ключ падає не на старті, а в момент першого реального виклику —
 * умовно, коли студент натиснув «відновити пароль» через тиждень після
 * деплою. Схема переносить цю помилку на запуск застосунку.
 *
 * Два свідомих рішення:
 *
 * 1. `looseObject`, а не `object`: у `process.env` лежать сотні сторонніх
 *    ключів (PATH, HOME, CI…). Строгий об'єкт Zod вирізав би їх із
 *    результату, і ConfigService перестав би їх бачити.
 *
 * 2. Жодних `coerce`/`transform` — усе лишається рядком. Результат валідації
 *    стає значеннями ConfigService, тож будь-яке приведення типу тут мовчки
 *    змінило б те, що отримує код (напр. `parseBoolean(SESSION_SECURE)` або
 *    `ms(SESSION_MAX_AGE)`). Задача схеми — впасти рано, а не переписати
 *    конфіг.
 */

/** Рядок із цифр — порт, код ЄДЕБО тощо. */
const numericString = (label: string) =>
	z.string().regex(/^\d+$/, `${label} має бути числом`)

/** Обов'язковий непорожній рядок (секрети, логіни, ідентифікатори). */
const required = (label: string) => z.string().min(1, `${label} не задано`)

export const envSchema = z.looseObject({
	NODE_ENV: z.enum(['development', 'production', 'test'], {
		message: "NODE_ENV має бути 'development' | 'production' | 'test'"
	}),

	// ── Застосунок ───────────────────────────────────────────────────
	APPLICATION_PORT: numericString('APPLICATION_PORT'),
	APPLICATION_URL: z.url({ message: 'APPLICATION_URL має бути URL' }),
	ALLOWED_ORIGIN: z.url({ message: 'ALLOWED_ORIGIN має бути URL' }),

	// ── Сесії та куки ────────────────────────────────────────────────
	// Мінімальну довжину секретів перевіряє assertStrongSecrets() у main.ts:
	// там це попередження в dev і фатальна помилка лише в production.
	COOKIES_SECRET: required('COOKIES_SECRET'),
	SESSION_SECRET: required('SESSION_SECRET'),
	SESSION_NAME: required('SESSION_NAME'),
	SESSION_DOMAIN: required('SESSION_DOMAIN'),
	/** Формат `ms`-бібліотеки: '30d', '12h' тощо. */
	SESSION_MAX_AGE: required('SESSION_MAX_AGE'),
	SESSION_HTTP_ONLY: z.enum(['true', 'false']),
	SESSION_SECURE: z.enum(['true', 'false']),
	SESSION_FOLDER: required('SESSION_FOLDER'),
	/** Ключ шифрування TOTP-секретів; якщо не задано — береться SESSION_SECRET. */
	AUTH_SECRET: z.string().optional(),

	// ── PostgreSQL ───────────────────────────────────────────────────
	POSTGRES_URI: required('POSTGRES_URI'),
	/** Розмір пулу з'єднань; якщо не задано — 10 (див. PrismaService). */
	DATABASE_POOL_MAX: numericString('DATABASE_POOL_MAX').optional(),

	// ── Redis ────────────────────────────────────────────────────────
	REDIS_HOST: required('REDIS_HOST'),
	REDIS_PORT: numericString('REDIS_PORT'),
	REDIS_PASSWORD: required('REDIS_PASSWORD'),

	// ── Пошта ────────────────────────────────────────────────────────
	MAIL_HOST: required('MAIL_HOST'),
	MAIL_PORT: numericString('MAIL_PORT'),
	MAIL_LOGIN: z.email({ message: 'MAIL_LOGIN має бути email-адресою' }),
	MAIL_PASSWORD: required('MAIL_PASSWORD'),

	// ── Google ───────────────────────────────────────────────────────
	GOOGLE_RECAPTCHA_SECRET_KEY: required('GOOGLE_RECAPTCHA_SECRET_KEY'),
	GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID'),
	GOOGLE_CLIENT_SECRET: required('GOOGLE_CLIENT_SECRET'),
	GOOGLE_WORKSPACE_ADMIN: z.email({
		message: 'GOOGLE_WORKSPACE_ADMIN має бути email-адресою'
	}),
	GOOGLE_DRIVE_CLIENT_EMAIL: z.email({
		message: 'GOOGLE_DRIVE_CLIENT_EMAIL має бути email-адресою'
	}),
	GOOGLE_DRIVE_PRIVATE_KEY: required('GOOGLE_DRIVE_PRIVATE_KEY'),
	GOOGLE_DRIVE_FOLDER_ID: required('GOOGLE_DRIVE_FOLDER_ID'),

	// ── ЄДЕБО ────────────────────────────────────────────────────────
	EDEBO_CODE: numericString('EDEBO_CODE'),
	EDBO_BASE_URL: z.url({ message: 'EDBO_BASE_URL має бути URL' }),
	EDBO_APP_KEY: required('EDBO_APP_KEY'),
	EDBO_USER_LOGIN: required('EDBO_USER_LOGIN'),
	EDBO_USER_PASSWORD: required('EDBO_USER_PASSWORD')
})
