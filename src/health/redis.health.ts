import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HealthIndicatorService } from '@nestjs/terminus'
import { createClient, RedisClientType } from 'redis'

/**
 * Health-індикатор Redis.
 *
 * Terminus не має вбудованого індикатора для Redis (лише Prisma/TypeORM/Mongo),
 * тому робимо власний на `PING`.
 *
 * Чому окреме з'єднання, а не те, що в `main.ts`: сесійний клієнт створюється
 * до підйому Nest-контейнера і живе поза DI. Тягнути його сюди означало б
 * переписати bootstrap сесій — ризик, не вартий health-check'а. Одне додаткове
 * простоююче з'єднання коштує дешево, а перевірка лишається незалежною від
 * стану сесійного пулу.
 */
@Injectable()
export class RedisHealthIndicator implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisHealthIndicator.name)
	private readonly client: RedisClientType

	public constructor(
		private readonly healthIndicatorService: HealthIndicatorService,
		configService: ConfigService
	) {
		this.client = createClient({
			password: configService.getOrThrow<string>('redis.password'),
			socket: {
				host: configService.getOrThrow<string>('redis.host'),
				port: configService.getOrThrow<number>('redis.port')
			}
		})

		// Без обробника клієнт кидає unhandled error при обриві з'єднання.
		this.client.on('error', (err: Error) =>
			this.logger.warn(`Redis health client error: ${err.message}`)
		)
	}

	public async onModuleInit(): Promise<void> {
		// На відміну від сесійного клієнта, тут НЕ fail-fast: недоступний Redis
		// має показуватись як "down" у /health, а не валити старт застосунку.
		try {
			await this.client.connect()
		} catch (error) {
			this.logger.warn(
				`Redis health client не підключився на старті: ${
					error instanceof Error ? error.message : String(error)
				}`
			)
		}
	}

	public async onModuleDestroy(): Promise<void> {
		if (this.client.isOpen) await this.client.quit()
	}

	/**
	 * Перевіряє доступність Redis командою PING.
	 * @param key - Ключ, під яким результат потрапить у відповідь /health.
	 */
	public check(key: string) {
		return this.healthIndicatorService
			.check(key)
			.attempt(async () => {
				if (!this.client.isOpen) await this.client.connect()
				const pong = await this.client.ping()
				return { response: pong }
			})
			.withTimeout(1500)
	}
}
