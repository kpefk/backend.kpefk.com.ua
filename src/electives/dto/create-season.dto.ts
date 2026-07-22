import { IsNotEmpty, IsString } from 'class-validator'

export class CreateSeasonDto {
	@IsString()
	@IsNotEmpty()
	blockId!: string

	@IsString()
	@IsNotEmpty()
	academicYear!: string
}
