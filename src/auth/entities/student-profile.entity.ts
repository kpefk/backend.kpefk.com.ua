import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { UserEntity } from '@/user/entities/user.entity'

export class StudentDataEntity {
  @ApiProperty({ description: 'ПІБ студента', example: 'Іваненко Іван Іванович' })
  @Expose()
  personFIO!: string

  @ApiProperty({ description: 'Дата народження', type: String, format: 'date-time', nullable: true })
  @Expose()
  birthday!: Date | null

  @ApiProperty({ description: 'Навчальна група', example: 'КН-11', nullable: true })
  @Expose()
  groupName!: string | null

  @ApiProperty({ description: 'Форма навчання (денна/заочна/...)', example: 'Денна', nullable: true })
  @Expose()
  educationFormName!: string | null

  @ApiProperty({ description: 'Курс', example: '1 курс', nullable: true })
  @Expose()
  courseName!: string | null

  @ApiProperty({ description: 'Джерело фінансування', example: 'Державне замовлення', nullable: true })
  @Expose()
  budgetTransferCategoryName!: string | null

  @ApiProperty({ description: 'Освітній рівень', example: 'Фаховий молодший бакалавр', nullable: true })
  @Expose()
  qualificationGroupName!: string | null

  @ApiProperty({ description: 'Спеціалізація / Освітня програма', example: "Комп'ютерна інженерія", nullable: true })
  @Expose()
  studyProgramName!: string | null

  @ApiProperty({ description: 'Дата вступу', type: String, format: 'date-time', nullable: true })
  @Expose()
  educationDateBegin!: Date | null
}

export class StudentProfileEntity extends UserEntity {
  @ApiProperty({
    description: 'Детальні академічні та особисті дані студента',
    type: () => StudentDataEntity,
    nullable: true
  })
  @Expose()
  declare student: StudentDataEntity | null

  public constructor(partial: Partial<StudentProfileEntity>) {
    super(partial)
  }
}
