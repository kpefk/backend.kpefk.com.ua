import {
	Controller,
	Get,
	Param,
	Query,
	Req,
	Res,
	UseGuards
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Request, Response } from 'express'

import { UserService } from '@/user/user.service'

import { Public } from '../decorators/public.decorator'
import { AuthProviderGuard } from '../guards/provider.guard'
import { regenerateSession } from '../session.util'

import { ProviderService } from './provider.service'

@ApiTags('OAuth')
@Controller('auth/oauth')
// Вхідна точка входу через провайдера — сесії тут ще немає за визначенням.
// Провайдера валідує AuthProviderGuard, а callback все одно вимагає валідний
// `code` від Google.
@Public()
export class OAuthController {
	public constructor(
		private readonly providerService: ProviderService,
		private readonly userService: UserService,
		private readonly configService: ConfigService
	) {}

	/**
	 * Перенаправляє на сторінку авторизації провайдера (Google тощо).
	 * Приклад: GET /auth/oauth/connect/google
	 */
	@ApiOperation({ summary: 'Перенаправити на сторінку OAuth-авторизації' })
	@ApiParam({ name: 'provider', example: 'google' })
	@UseGuards(AuthProviderGuard)
	@Get('connect/:provider')
	public connect(
		@Param('provider') provider: string,
		@Res() res: Response
	): void {
		const service = this.providerService.findByService(provider)!
		res.redirect(service.getAuthUrl())
	}

	/**
	 * Callback від провайдера після успішної авторизації.
	 * Обмінює code на профіль, знаходить юзера, зберігає сесію,
	 * перенаправляє на frontend.
	 */
	@ApiOperation({ summary: 'Обробити callback від OAuth-провайдера' })
	@ApiParam({ name: 'provider', example: 'google' })
	@UseGuards(AuthProviderGuard)
	@Get('callback/:provider')
	public async callback(
		@Param('provider') provider: string,
		@Query('code') code: string,
		@Req() req: Request,
		@Res() res: Response
	): Promise<void> {
		const frontendUrl =
			this.configService.getOrThrow<string>('ALLOWED_ORIGIN')

		try {
			const service = this.providerService.findByService(provider)!
			const userInfo = await service.findUserByCode(code)

			const user = await this.userService
				.findByEmail(userInfo.email)
				.catch(() => null)

			if (!user) {
				// Акаунт з таким email не знайдено — реєстрація тільки через форму
				return res.redirect(
					`${frontendUrl}/sign-in?error=account_not_found`
				)
			}

			if (!user.isActive) {
				return res.redirect(
					`${frontendUrl}/sign-in?error=account_inactive`
				)
			}

			await regenerateSession(req, user.id)

			res.redirect(`${frontendUrl}/dashboard`)
		} catch {
			res.redirect(`${frontendUrl}/sign-in?error=oauth_failed`)
		}
	}
}
