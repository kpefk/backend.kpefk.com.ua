import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards
} from '@nestjs/common'
import { Recaptcha } from '@nestlab/google-recaptcha'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'

import { NewPasswordDto } from './dto/new-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { PasswordRecoveryService } from './password-recovery.service'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Controller for managing password recovery.
 */
@ApiTags('Відновлення паролю')
@Controller('auth/password-recovery')
export class PasswordRecoveryController {
  /**
   * Constructor of the password recovery controller.
   * @param passwordRecoveryService - The password recovery service.
   */
  public constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService
  ) {}

  /**
   * Requests password reset and sends a token to the specified email.
   * @param dto - DTO containing the user's email address.
   * @returns true, if the token was sent successfully.
   */
  @ApiOperation({ summary: 'Запит на скидання паролю' })
  @ApiResponse({ status: 200, description: 'Токен успішно відправлено' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 404, description: 'Користувача не знайдено' })
  @Recaptcha()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(ThrottlerGuard)
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(ThrottlerGuard)
  @Post('new/:token')
  @HttpCode(HttpStatus.OK)
  public async newPassword(
    @Body() dto: NewPasswordDto,
    @Param('token') token: string
  ) {
    return this.passwordRecoveryService.new(dto, token)
  }
}