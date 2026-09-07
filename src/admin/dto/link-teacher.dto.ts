import { ApiProperty } from '@nestjs/swagger'
import { IsUUID, ValidateIf } from 'class-validator'

/**
 * DTO для прив'язки / відв'язки картки викладача до акаунту.
 * `null` — відв'язати поточного викладача.
 */
export class LinkTeacherDto {
	@ApiProperty({
		description:
			"UUID картки викладача в ЄДЕБО; null — відв'язати поточного викладача",
		nullable: true,
		example: '9f1b8d6e-6b8a-4f0e-9f3a-2c1b0d4e5f6a'
	})
	@ValidateIf(o => o.teacherId !== null)
	@IsUUID('4', { message: 'teacherId повинен бути валідним UUID або null.' })
	teacherId!: string | null
}
