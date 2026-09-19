import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'

import { Public } from '@/auth/decorators/public.decorator'

import { CreateFirstAdministratorDto } from './dto/create-first-administrator.dto'
import { SetupService } from './setup.service'

/**
 * Первинне налаштування системи.
 *
 * Маршрути публічні свідомо: на порожній базі ще немає нікого, хто міг би
 * авторизуватись. Замість авторизації їх закриває стан самої системи —
 * щойно з'являється перший користувач, створення адміністратора повертає 409,
 * а `status` віддає `needsSetup: false`.
 */
@ApiTags('Первинне налаштування')
@Controller('setup')
export class SetupController {
	public constructor(private readonly setupService: SetupService) {}

	@ApiOperation({
		summary: 'Чи потрібне первинне налаштування системи'
	})
	@ApiResponse({
		status: 200,
		schema: { example: { needsSetup: true } }
	})
	@Public()
	// Маршрут анонімний і читає лічильник користувачів — тримаємо помірний ліміт,
	// щоб його не можна було використати для зондування стану системи.
	@Throttle({ default: { limit: 20, ttl: 60_000 } })
	@Get('status')
	@HttpCode(HttpStatus.OK)
	public status() {
		return this.setupService.getStatus()
	}

	@ApiOperation({
		summary: 'Створити першого адміністратора (лише на порожній системі)'
	})
	@ApiResponse({ status: 201, description: 'Адміністратора створено' })
	@ApiResponse({
		status: 409,
		description: 'Первинне налаштування вже виконано'
	})
	@Public()
	// Жорсткий ліміт: маршрут анонімний і створює обліковий запис із повними правами.
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('administrator')
	@HttpCode(HttpStatus.CREATED)
	public createFirstAdministrator(
		@Body() dto: CreateFirstAdministratorDto,
		@Req() req: Request
	) {
		return this.setupService.createFirstAdministrator(dto, req.ip ?? null)
	}
}
