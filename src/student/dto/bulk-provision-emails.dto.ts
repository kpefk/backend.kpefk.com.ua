import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator'

export class BulkProvisionEmailsDto {
	@ApiProperty({
		type: [String],
		description: 'ID студентів, відібраних поточними фільтрами на сторінці',
		maxItems: 5000
	})
	@IsArray()
	@ArrayMaxSize(5000)
	@IsUUID('4', { each: true })
	studentIds!: string[]
}
