import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res
} from '@nestjs/common'
import { Recaptcha } from '@nestlab/google-recaptcha'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Request, Response } from 'express'

import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { UserEntity } from '@/user/entities/user.entity'

/**
 * Контролер для автентифікації користувачів.
 */
@ApiTags('Автентифікація')
@Controller('auth')
export class AuthController {
  /**
   * Конструктор контролера автентифікації.
   * @param authService - Сервіс для роботи з автентифікацією.
   */
  public constructor(private readonly authService: AuthService) {}

  /**
   * Виконує вхід користувача в систему.
   * Якщо увімкнена двофакторна автентифікація — надсилає код на email.
   * @param req - Об'єкт запиту Express.
   * @param dto - Дані для входу (email, пароль, опціональний 2FA код).
   * @returns Користувач або повідомлення про необхідність 2FA коду.
   */
  @ApiOperation({ summary: 'Вхід в систему' })
  @ApiResponse({ status: 200, description: 'Успішний вхід', type: UserEntity })
  @ApiResponse({ status: 200, description: 'Потрібен код двофакторної автентифікації', schema: { example: { message: 'Перевірте вашу поштову адресу. Потрібен код двофакторної аутентифікації.' } } })
  @ApiResponse({ status: 400, description: 'Невірні дані або невірна капча' })
  @ApiResponse({ status: 401, description: 'Невірний пароль або акаунт деактивовано' })
  @ApiResponse({ status: 404, description: 'Користувача не знайдено' })
  @Recaptcha()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  public async login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.authService.login(req, dto)
  }

  /**
   * Завершує сесію поточного користувача.
   * @param req - Об'єкт запиту Express.
   * @param res - Об'єкт відповіді Express.
   */
  @ApiOperation({ summary: 'Вихід з системи' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Сесію успішно завершено' })
  @ApiResponse({ status: 500, description: 'Не вдалося завершити сесію' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.logout(req, res)
  }
}