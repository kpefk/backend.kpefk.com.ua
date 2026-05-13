import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MinLength, Validate } from 'class-validator'

import { IsPasswordsMatchingConstraint } from '@/libs/common/decorators/is-passwords-matching-constraint.decorator'

/**
 * DTO для зміни паролю користувача.
 */
export class ChangePasswordDto {
  /**
   * Поточний пароль користувача.
   */
  @ApiProperty({ description: 'Поточний пароль користувача', example: 'OldPassword123' })
  @IsString({ message: 'Пароль повинен бути текстом.' })
  @IsNotEmpty({ message: 'Поточний пароль обов\'язковий для заповнення.' })
  currentPassword!: string

  /**
   * Новий пароль користувача.
   */
  @ApiProperty({ description: 'Новий пароль користувача', example: 'NewPassword123' })
  @IsString({ message: 'Пароль повинен бути текстом.' })
  @IsNotEmpty({ message: 'Новий пароль обов\'язковий для заповнення.' })
  @MinLength(8, { message: 'Пароль повинен містити щонайменше 8 символів.' })
  password!: string

  /**
   * Підтвердження нового паролю.
   */
  @ApiProperty({ description: 'Підтвердження нового паролю', example: 'NewPassword123' })
  @IsString({ message: 'Пароль повинен бути текстом.' })
  @IsNotEmpty({ message: 'Підтвердження паролю обов\'язкове для заповнення.' })
  @Validate(IsPasswordsMatchingConstraint)
  passwordRepeat!: string
}