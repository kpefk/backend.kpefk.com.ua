import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
	IsBoolean,
	IsEmail,
	IsOptional,
	IsString,
	Length,
	Matches,
	MinLength
} from 'class-validator'

export class RegisterStudentDto {
	@ApiProperty({
		example: 'student@kpefk.edu.ua',
		description: 'Email студента'
	})
	@IsEmail({}, { message: 'Введіть коректну email-адресу' })
	email!: string

	@ApiProperty({
		example: 'P@ssw0rd!',
		description: 'Пароль (мін. 8 символів)'
	})
	@MinLength(8, { message: 'Пароль має містити щонайменше 8 символів' })
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
		message: 'Пароль має містити великі та малі літери, а також цифри'
	})
	password!: string

	// РНОКПП (ІПН) — або вказується, або no_rnokpp = true
	@ApiPropertyOptional({
		example: '1234567890',
		description: 'РНОКПП (10 цифр)'
	})
	@IsOptional()
	@IsString()
	@Length(10, 10, { message: 'РНОКПП має містити 10 цифр' })
	@Matches(/^\d{10}$/, { message: 'РНОКПП має містити лише цифри' })
	rnokpp?: string

	@ApiPropertyOptional({ description: 'Відмова від надання РНОКПП' })
	@IsOptional()
	@IsBoolean()
	no_rnokpp?: boolean

	// Студентський квиток — або вказується, або no_student_ticket = true
	@ApiPropertyOptional({
		example: 'СТ',
		description: 'Серія студентського квитка'
	})
	@IsOptional()
	@IsString()
	serial_ticket?: string

	@ApiPropertyOptional({
		example: '123456',
		description: 'Номер студентського квитка'
	})
	@IsOptional()
	@IsString()
	number_ticket?: string

	@ApiPropertyOptional({
		description: 'Відмова від надання студентського квитка'
	})
	@IsOptional()
	@IsBoolean()
	no_student_ticket?: boolean

	// Паспорт — використовується як fallback якщо немає студентського квитка
	@ApiPropertyOptional({ example: 'АА', description: 'Серія паспорта' })
	@IsOptional()
	@IsString()
	serial_passport?: string

	@ApiPropertyOptional({ example: '123456', description: 'Номер паспорта' })
	@IsOptional()
	@IsString()
	number_passport?: string

	@ApiProperty({ description: 'Згода на обробку персональних даних' })
	@IsBoolean({
		message: 'Необхідно надати згоду на обробку персональних даних'
	})
	consent!: boolean
}
