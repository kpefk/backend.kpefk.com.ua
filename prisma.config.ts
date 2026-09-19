import { defineConfig } from 'prisma/config'

// Побічний ефект імпорту: вантажить env-файли поточного тіра (`.env.<tier>`,
// потім базовий `.env`) у process.env. Без цього Prisma CLI бачив би лише
// базовий `.env`, і `NODE_ENV=test prisma migrate deploy` пішов би мігрувати
// DEV-базу — тобто рівно те, чого тіри мають не допускати.
//
// Модуль `environment` навмисно не має рантайм-залежностей від NestJS
// (ConfigService імпортується як тип), тож його безпечно тягнути в CLI-конфіг.
import './src/config/environment'

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'bun ./prisma/seed.ts'
	},
	datasource: {
		url: process.env['POSTGRES_URI']
	}
})
