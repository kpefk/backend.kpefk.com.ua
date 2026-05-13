import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

/**
 * DTO для входу користувача в систему.
 */
export class LoginDto {
	/**
	 * Email користувача.
	 * @example example@kpefk.com.ua
	 */
	@ApiProperty({ description: 'Email користувача', example: 'my@kpefk.com.ua' })
	@IsString({ message: 'Email повинен бути рядком.' })
	@IsEmail({}, { message: 'Некоректний формат email.' })
	@IsNotEmpty({ message: 'Email повинен бути заповнений.' })
	email?: string

	/**
	 * Пароль користувача.
	 * @example password123
	 */
	@ApiProperty({ description: 'Пароль користувача', example: 'password123' })
	@IsString({ message: 'Пароль повинен бути рядком.' })
	@IsNotEmpty({ message: 'Поле пароль не може бути пустим.' })
	@MinLength(6, { message: 'Пароль повинен містити не менше 6 символів.' })
	password?: string

	/**
	 * Код двохфакторної аутентифікації (необов'язково).
	 * @example 123456
	 */
	@ApiPropertyOptional({ description: 'Код двохфакторної аутентифікації', example: '123456' })
	@IsOptional()
	@IsString()
	code?: string
}
