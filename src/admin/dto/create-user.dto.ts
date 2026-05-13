import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { UserRole } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO для створення користувача адміністратором.
 */
export class CreateUserDto {
  /**
   * Email користувача.
   * @example example@kpefk.com.ua
   */
  @ApiProperty({
		description: 'Email користувача',
		example: 'my@kpefk.com.ua'
	})
  @IsString({ message: 'Email повинен бути текстом.' })
  @IsEmail({}, { message: 'Некоректний формат Email.' })
  @IsNotEmpty({ message: 'Email обов\'язковий для заповнення.' })
  email!: string

  /**
   * Роль користувача в системі.
   * @example STUDENT
   */
  @ApiProperty({
		description: 'Роль користувача в системі',
		example: 'STUDENT'
	})
  @IsEnum(UserRole, { message: 'Некоректна роль користувача.' })
  @IsNotEmpty({ message: 'Роль обов\'язкова для заповнення.' })
  role!: UserRole
}