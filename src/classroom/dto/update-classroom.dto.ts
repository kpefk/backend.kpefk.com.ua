import { IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateClassroomDto {
  @ApiProperty({
		description: 'Номер кабінету',
		example: '101'
	})
  @IsOptional()
  @IsString({ message: 'Номер кабінету має бути рядком.' })
  number?: string

  @ApiProperty({
		description: 'Назва кабінету',
		example: 'Кабінет математики'
	})
  @IsOptional()
  @IsString({ message: 'Назва кабінету має бути рядком.' })
  name?: string

  @ApiProperty({
		description: 'ID завідувача',
		example: '1'
	})
  @IsOptional()
  @IsString({ message: 'ID завідувача має бути рядком.' })
  teacherId?: string | null
}