import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateSpecialtyDto {
  @ApiProperty({ description: 'Код спеціальності', example: 'F3' })
  @IsString({ message: 'Код спеціальності має бути рядком.' })
  @MinLength(1, { message: 'Код не може бути порожнім.' })
  @MaxLength(20, { message: 'Код не може перевищувати 20 символів.' })
  code!: string

  @ApiProperty({ description: 'Назва спеціальності', example: "Комп'ютерні науки" })
  @IsString({ message: 'Назва має бути рядком.' })
  @MinLength(2, { message: 'Назва занадто коротка.' })
  @MaxLength(255, { message: 'Назва не може перевищувати 255 символів.' })
  name!: string

  @ApiPropertyOptional({ description: 'Скорочена назва', example: 'КН' })
  @IsOptional()
  @IsString({ message: 'Скорочена назва має бути рядком.' })
  @MaxLength(50)
  shortName?: string

  @ApiPropertyOptional({ description: 'Чи активна спеціальність', default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive має бути булевим значенням.' })
  isActive?: boolean
}
