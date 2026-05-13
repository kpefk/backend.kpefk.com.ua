import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty } from 'class-validator'

export class ResetPasswordDto {
	@ApiProperty({
		description: 'Email користувача',
		example: 'my@kpefk.com.ua'
	})
	@IsEmail({}, { message: 'Введіть коректний адрес електронної пошти.' })
	@IsNotEmpty({ message: 'Поле email не може бути порожнім.' })
	email!: string
}
