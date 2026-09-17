import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
	HealthCheck,
	HealthCheckService,
	PrismaHealthIndicator
} from '@nestjs/terminus'
import { Throttle } from '@nestjs/throttler'

import { Public } from '@/auth/decorators/public.decorator'
import { PrismaService } from '@/prisma/prisma.service'

import { RedisHealthIndicator } from './redis.health'

@ApiTags('Health')
@Controller('health')
export class HealthController {
	public constructor(
		private readonly health: HealthCheckService,
		private readonly prismaIndicator: PrismaHealthIndicator,
		private readonly redisIndicator: RedisHealthIndicator,
		private readonly prisma: PrismaService
	) {}

	/**
	 * Перевіряє доступність БД (Prisma) і Redis.
	 *
	 * 200 — усе піднято, 503 — хоч одна залежність лежить: саме це й читає
	 * оркестратор/балансувальник, вирішуючи, чи слати трафік на інстанс.
	 */
	@ApiOperation({ summary: 'Стан застосунку та його залежностей' })
	@ApiResponse({ status: 200, description: 'Усі залежності доступні' })
	@ApiResponse({ status: 503, description: 'Одна із залежностей недоступна' })
	// Публічний свідомо: пробу виконує оркестратор/uptime-монітор без сесії.
	// Відповідь не містить даних — лише статуси залежностей.
	@Public()
	// Ліміт вищий за дефолтний: liveness/readiness-проби ходять часто
	// (кожні кілька секунд з кількох реплік) і не мають ловити 429.
	@Throttle({ default: { ttl: 60_000, limit: 300 } })
	@Get()
	@HealthCheck()
	public check() {
		return this.health.check([
			() => this.prismaIndicator.pingCheck('database', this.prisma),
			() => this.redisIndicator.check('redis')
		])
	}
}
