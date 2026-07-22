import {
	IsBoolean,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUrl
} from 'class-validator'

export class CreateOfferingDto {
	@IsString()
	@IsNotEmpty()
	componentId!: string

	@IsOptional()
	@IsUrl()
	syllabusUrl?: string

	@IsOptional()
	@IsBoolean()
	isHigherEd?: boolean

	@IsOptional()
	@IsString()
	description?: string
}
