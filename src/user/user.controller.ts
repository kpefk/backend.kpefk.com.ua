import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TwoFactorMethod, UserRole } from '@prisma/client'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { UpdateUserDto } from './dto/update-user.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { RequestEmailChangeDto } from './dto/request-email-change.dto'
import { UserService } from './user.service'
import { UserEntity } from './entities/user.entity'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * Контролер для управління користувачами.
 */
@ApiTags('Користувачі')
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  /**
   * Конструктор контролера користувачів.
   * @param userService - Сервіс для роботи з користувачами.
   */
  public constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Отримує профіль поточного користувача.
   * @param userId - ID авторизованого користувача.
   * @returns Профіль користувача.
   */
  @ApiOperation({ summary: 'Отримати профіль поточного користувача' })
  @ApiResponse({ status: 200, description: 'Профіль успішно отримано', type: UserEntity })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  public async findProfile(
    @Authorized('id') userId: string
  ): Promise<UserEntity> {
    const user = await this.userService.findById(userId)
    return new UserEntity(user)
  }

  /**
   * Отримує користувача за ID (доступно тільки адміністраторам).
   * @param id - ID користувача.
   * @returns Знайдений користувач.
   */
  @ApiOperation({ summary: 'Отримати користувача за ID' })
  @ApiParam({ name: 'id', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Користувача успішно знайдено', type: UserEntity })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Користувача не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('by-id/:id')
  public async findById(@Param('id') id: string): Promise<UserEntity> {
    const user = await this.userService.findById(id)
    return new UserEntity(user)
  }

  /**
   * Оновлює профіль поточного користувача.
   * @param userId - ID авторизованого користувача.
   * @param dto - Дані для оновлення профілю.
   * @returns Оновлений профіль користувача.
   */
  @ApiOperation({ summary: 'Оновити профіль поточного користувача' })
  @ApiResponse({ status: 200, description: 'Профіль успішно оновлено', type: UserEntity })
  @ApiResponse({ status: 400, description: 'Невірні дані' })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Patch('profile')
  public async updateProfile(
    @Authorized('id') userId: string,
    @Body() dto: UpdateUserDto
  ): Promise<UserEntity> {
    const user = await this.userService.update(userId, dto)
    return new UserEntity(user)
  }

  /**
   * Змінює пароль поточного користувача.
   * @param userId - ID авторизованого користувача.
   * @param dto - DTO з поточним та новим паролем.
   * @returns Оновлений профіль користувача.
   */
  @ApiOperation({ summary: 'Змінити пароль поточного користувача' })
  @ApiResponse({ status: 200, description: 'Пароль успішно змінено', type: UserEntity })
  @ApiResponse({ status: 400, description: 'Невірні дані' })
  @ApiResponse({ status: 401, description: 'Невірний поточний пароль або не авторизований' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Patch('profile/change-password')
  public async changePassword(
    @Authorized('id') userId: string,
    @Body() dto: ChangePasswordDto
  ): Promise<UserEntity> {
    const user = await this.userService.changePassword(
      userId,
      dto.currentPassword,
      dto.password
    )
    return new UserEntity(user)
  }

  /**
   * Ініціює зміну email поточного користувача.
   * Сам email НЕ змінюється одразу — на нову адресу надсилається лист
   * з посиланням для підтвердження.
   * @param userId - ID авторизованого користувача.
   * @param dto - Нова адреса + поточний пароль.
   */
  @ApiOperation({ summary: 'Запит на зміну email (з підтвердженням поштою)' })
  @ApiResponse({ status: 200, description: 'Лист підтвердження надіслано на нову адресу' })
  @ApiResponse({ status: 401, description: 'Невірний пароль або не авторизований' })
  @ApiResponse({ status: 409, description: 'Адреса вже використовується' })
  @Authorization()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('profile/email')
  public async requestEmailChange(
    @Authorized('id') userId: string,
    @Body() dto: RequestEmailChangeDto
  ): Promise<{ success: boolean }> {
    return this.userService.requestEmailChange(userId, dto.newEmail, dto.password)
  }

  /**
   * Підтверджує зміну email за токеном з листа та перенаправляє на фронтенд.
   * Публічний маршрут — токен є секретом.
   * @param token - Токен підтвердження зміни email.
   * @param res - Express Response для редіректу.
   */
  @ApiOperation({ summary: 'Підтвердити зміну email за токеном' })
  @ApiParam({ name: 'token', description: 'Токен підтвердження' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(ThrottlerGuard)
  @Get('email-change/confirm/:token')
  public async confirmEmailChange(
    @Param('token') token: string,
    @Res() res: Response
  ): Promise<void> {
    const origin = this.configService.getOrThrow<string>('ALLOWED_ORIGIN')
    try {
      await this.userService.confirmEmailChange(token)
      res.redirect(`${origin}/profile?email=changed`)
    } catch {
      res.redirect(`${origin}/profile?email=error`)
    }
  }

  /**
   * Скидає пароль користувача (доступно тільки адміністратору).
   * Генерує тимчасовий пароль і відправляє на email користувача.
   * @param id - ID користувача якому скидають пароль.
   * @returns Оновлений профіль користувача.
   */
  @ApiOperation({ summary: 'Скинути пароль користувача (адміністратор)' })
  @ApiParam({ name: 'id', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Пароль успішно скинуто, тимчасовий пароль надіслано на email', type: UserEntity })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Користувача не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Patch(':id/reset-password')
  public async resetPassword(@Param('id') id: string): Promise<UserEntity> {
    const user = await this.userService.resetPasswordByAdmin(id)
    return new UserEntity(user)
  }

  /**
   * Скидає двофакторну автентифікацію для довільного користувача (адмін).
   * @param id - ID користувача.
   * @returns { success: true }
   */
  @ApiOperation({ summary: 'Скинути 2FA для користувача (адміністратор)' })
  @ApiParam({ name: 'id', description: 'ID користувача' })
  @Authorization(UserRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Post(':id/2fa/reset')
  public async reset2FA(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.prisma.user.update({
      where: { id },
      data: {
        twoFactorMethod: TwoFactorMethod.NONE,
        isTwoFactorEnabled: false,
        totpSecret: null,
        totpVerifiedAt: null,
      },
    })
    return { success: true }
  }
}