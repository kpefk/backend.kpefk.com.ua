import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { ClassroomType } from '@prisma/client'

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

  @ApiProperty({ description: 'Місткість (к-сть місць)', example: 30, required: false })
  @IsOptional()
  @IsInt({ message: 'Місткість має бути цілим числом.' })
  @Min(1)
  capacity?: number | null

  @ApiProperty({
    description: 'Тип аудиторії',
    enum: ClassroomType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClassroomType)
  type?: ClassroomType | null
}