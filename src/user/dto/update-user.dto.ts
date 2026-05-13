import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

/**
 * DTO для оновлення даних користувача.
 */
export class UpdateUserDto {
  /**
   * Email користувача.
   * @example example@kpefk.com.ua
   */
  @ApiPropertyOptional({ description: 'Новий email користувача', example: 'example@kpefk.com.ua' })
  @IsOptional()
  @IsString({ message: 'Email повинен бути текстом.' })
  @IsEmail({}, { message: 'Некоректний формат Email.' })
  @IsNotEmpty({ message: 'Email обов\'язковий для заповнення.' })
  email?: string

  /**
   * Прапорець, що вказує, чи включена двофакторна аутентифікація.
   */
  @ApiPropertyOptional({ description: 'Увімкнути/вимкнути двофакторну автентифікацію', example: false })
  @IsOptional()
  @IsBoolean({ message: 'isTwoFactorEnabled повинно бути булевим значенням.' })
  isTwoFactorEnabled?: boolean
}