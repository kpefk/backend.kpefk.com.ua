import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

/**
 * DTO для запиту на зміну email.
 * Зміна підтверджується листом на нову адресу, тому потрібен поточний пароль.
 */
export class RequestEmailChangeDto {
  @ApiProperty({ description: 'Нова email-адреса', example: 'new@kpefk.com.ua' })
  @IsString({ message: 'Email повинен бути рядком.' })
  @IsEmail({}, { message: 'Некоректний формат email.' })
  @IsNotEmpty({ message: 'Email обов\'язковий для заповнення.' })
  newEmail!: string

  @ApiProperty({ description: 'Поточний пароль для підтвердження особи' })
  @IsString({ message: 'Пароль повинен бути рядком.' })
  @IsNotEmpty({ message: 'Поле пароль не може бути пустим.' })
  password!: string
}
