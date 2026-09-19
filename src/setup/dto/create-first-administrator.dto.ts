import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Matches, MinLength } from 'class-validator'

/**
 * Облікові дані першого адміністратора.
 *
 * Правила пароля збігаються з `RegisterStudentDto` — єдиний стандарт стійкості
 * для всіх облікових записів системи.
 */
export class CreateFirstAdministratorDto {
	@ApiProperty({
		description: 'Email адміністратора — буде логіном',
		example: 'admin@kpefk.com.ua'
	})
	@IsEmail({}, { message: 'Введіть коректну email-адресу' })
	email!: string

	@ApiProperty({
		description:
			'Пароль: щонайменше 8 символів, великі та малі літери, цифри',
		example: 'Admin2026pass'
	})
	@IsString({ message: 'Пароль має бути рядком' })
	@MinLength(8, { message: 'Пароль має містити щонайменше 8 символів' })
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
		message: 'Пароль має містити великі та малі літери, а також цифри'
	})
	password!: string
}
