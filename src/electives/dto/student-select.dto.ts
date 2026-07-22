import { IsNotEmpty, IsString } from 'class-validator'

export class StudentSelectDto {
	@IsString()
	@IsNotEmpty()
	seasonId!: string

	@IsString()
	@IsNotEmpty()
	componentId!: string
}
