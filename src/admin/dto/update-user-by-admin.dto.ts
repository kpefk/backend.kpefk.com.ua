import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { UserRole } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO для оновлення користувача адміністратором.
 */
export class UpdateUserByAdminDto {
  /**
   * Email користувача.
   */
  @ApiProperty({
		description: 'Email користувача',
		example: 'my@kpefk.com.ua'
	})
  @IsOptional()
  @IsString({ message: 'Email повинен бути текстом.' })
  @IsEmail({}, { message: 'Некоректний формат Email.' })
  email?: string

  /**
   * Роль користувача в системі.
   */
  @ApiProperty({
		description: 'Роль користувача в системі',
		example: 'STUDENT'
	})
  @IsOptional()
  @IsEnum(UserRole, { message: 'Некоректна роль користувача.' })
  role?: UserRole

  /**
   * Статус активності користувача.
   */
  @ApiProperty({
		description: 'Статус активності користувача',
		example: true
	})
  @IsOptional()
  @IsBoolean({ message: 'isActive повинно бути булевим значенням.' })
  isActive?: boolean
}