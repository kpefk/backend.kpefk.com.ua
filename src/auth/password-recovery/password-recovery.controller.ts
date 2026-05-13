import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from '@nestjs/common'
import { Recaptcha } from '@nestlab/google-recaptcha'

import { NewPasswordDto } from './dto/new-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { PasswordRecoveryService } from './password-recovery.service'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Контролер для управління відновленням паролю.
 */
@ApiTags('Відновлення паролю')
@Controller('auth/password-recovery')
export class PasswordRecoveryController {
  /**
   * Конструктор контролера відновлення паролю.
   * @param passwordRecoveryService - Сервіс для управління відновленням паролю.
   */
  public constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService
  ) {}

  /**
   * Запрошує скидання пароля та відправляє токен на вказаний Email.
   * @param dto - DTO з адресом електронної пошти користувача.
   * @returns true, якщо токен успішно відправлено.
   */
  @ApiOperation({ summary: 'Запит на скидання паролю' })
  @ApiResponse({ status: 200, description: 'Токен успішно відправлено' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 404, description: 'Користувача не знайдено' })
  @Recaptcha()
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  public async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordRecoveryService.reset(dto)
  }

  /**
   * Встановлює новий пароль для користувача.
   * @param dto - DTO з новим паролем.
   * @param token - Токен для скидання паролю.
   * @returns true, якщо пароль успішно змінено.
   */
  @ApiOperation({ summary: 'Встановлення нового паролю' })
  @ApiResponse({ status: 200, description: 'Пароль успішно змінено' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 404, description: 'Користувача не знайдено' })
  @ApiResponse({ status: 400, description: 'Токен застарів' })
  @Recaptcha()
  @Post('new/:token')
  @HttpCode(HttpStatus.OK)
  public async newPassword(
    @Body() dto: NewPasswordDto,
    @Param('token') token: string
  ) {
    return this.passwordRecoveryService.new(dto, token)
  }
}