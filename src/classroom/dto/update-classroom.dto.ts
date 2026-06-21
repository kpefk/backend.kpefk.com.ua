import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ClassroomType } from '@prisma/client'

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