import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'

/**
 * DTO для оновлення даних користувача.
 *
 * Зміна email тут НЕ підтримується — для цього є окремий підтверджуваний
 * флоу (POST /users/profile/email + GET /users/email-change/confirm/:token),
 * щоб уникнути зміни пошти без верифікації.
 */
export class UpdateUserDto {
  /**
   * Прапорець, що вказує, чи включена двофакторна аутентифікація.
   */
  @ApiPropertyOptional({ description: 'Увімкнути/вимкнути двофакторну автентифікацію', example: false })
  @IsOptional()
  @IsBoolean({ message: 'isTwoFactorEnabled повинно бути булевим значенням.' })
  isTwoFactorEnabled?: boolean
}