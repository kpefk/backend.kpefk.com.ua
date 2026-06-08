import { ApiProperty } from '@nestjs/swagger'
import { TwoFactorMethod, UserRole } from '@prisma/client'
import { Exclude, Expose } from 'class-transformer'

export class UserEntity {
  @ApiProperty({ description: 'Унікальний ідентифікатор користувача', example: 'uuid' })
  @Expose()
  id!: string

  @ApiProperty({ description: 'Email користувача', example: 'user@kpefk.edu.ua' })
  @Expose()
  email!: string

  @Exclude()
  password!: string

  @Exclude()
  totpSecret?: string | null

  @ApiProperty({ description: 'Роль користувача', enum: UserRole, example: UserRole.STUDENT })
  @Expose()
  role!: UserRole

  @ApiProperty({ description: 'Чи увімкнена двофакторна автентифікація (legacy)', example: false })
  @Expose()
  isTwoFactorEnabled!: boolean

  @ApiProperty({ description: 'Метод двофакторної автентифікації', enum: TwoFactorMethod })
  @Expose()
  twoFactorMethod!: TwoFactorMethod

  @ApiProperty({ description: 'Чи є перший вхід в систему', example: true })
  @Expose()
  isFirstLogin!: boolean

  @ApiProperty({ description: 'Чи активний акаунт', example: true })
  @Expose()
  isActive!: boolean

  @ApiProperty({ description: 'Дані студента', required: false })
  @Expose()
  student?: {
    personFIO: string | null
    groupName: string | null
  } | null

  @ApiProperty({ description: 'Дані викладача', required: false })
  @Expose()
  teacher?: {
    lastName: string | null
    firstName: string | null
    middleName: string | null
    positionName: string | null
  } | null

  @ApiProperty({ description: 'Дата створення акаунту' })
  @Expose()
  createdAt!: Date

  @ApiProperty({ description: 'Дата останнього оновлення акаунту' })
  @Expose()
  updatedAt!: Date

  public constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial)
  }
}