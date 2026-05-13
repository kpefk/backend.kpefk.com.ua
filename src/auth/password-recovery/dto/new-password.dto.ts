import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class NewPasswordDto {
	@ApiProperty({
		description: 'Новий пароль користувача',
		example: 'newPassword123'
	})
	
	@IsString({ message: 'Пароль повинен бути рядком.' })
	@MinLength(6, { message: 'Пароль повинен містити не менше 6 символів.' })
	@IsNotEmpty({ message: 'Поле новий пароль не може бути порожнім.' })
	password!: string
}
