import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class CreateClassroomDto {
  @ApiProperty({
		description: 'Номер кабінету',
		example: '101'
	})
  @IsString({ message: 'Номер кабінету має бути рядком.' })
  number!: string

  @ApiProperty({
		description: 'Назва кабінету',
		example: 'Кабінет математики'
	})
  @IsString({ message: 'Назва кабінету має бути рядком.' })
  name!: string

  @ApiProperty({
		description: 'ID завідувача',
		example: '1'
	})
  @IsOptional()
  @IsString({ message: 'ID завідувача має бути рядком.' })
  teacherId?: string
}