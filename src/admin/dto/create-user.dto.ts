import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator'
import { UserRole } from '@prisma/client'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * DTO для створення користувача адміністратором.
 */
export class CreateUserDto {
  @ApiProperty({ description: 'Email користувача', example: 'my@kpefk.com.ua' })
  @IsString({ message: 'Email повинен бути текстом.' })
  @IsEmail({}, { message: 'Некоректний формат Email.' })
  @IsNotEmpty({ message: 'Email обов\'язковий для заповнення.' })
  email!: string

  @ApiProperty({ description: 'Роль користувача в системі', example: 'STUDENT' })
  @IsEnum(UserRole, { message: 'Некоректна роль користувача.' })
  @IsNotEmpty({ message: 'Роль обов\'язкова для заповнення.' })
  role!: UserRole

  @ApiPropertyOptional({ description: 'UUID запису студента в ЄДЕБО (обов\'язково для ролі STUDENT)' })
  @ValidateIf(o => o.role === UserRole.STUDENT)
  @IsUUID('4', { message: 'studentId повинен бути валідним UUID.' })
  @IsNotEmpty({ message: 'studentId обов\'язковий для ролі Студент.' })
  studentId?: string

  @ApiPropertyOptional({ description: 'UUID запису викладача в ЄДЕБО (обов\'язково для ролі TEACHER, опціонально для інших)' })
  @ValidateIf(o => o.role === UserRole.TEACHER || o.teacherId !== undefined)
  @IsUUID('4', { message: 'teacherId повинен бути валідним UUID.' })
  @ValidateIf(o => o.role === UserRole.TEACHER)
  @IsNotEmpty({ message: 'teacherId обов\'язковий для ролі Викладач.' })
  teacherId?: string
}