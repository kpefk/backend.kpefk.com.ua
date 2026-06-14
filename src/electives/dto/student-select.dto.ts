import { IsString, IsNotEmpty } from 'class-validator'

export class StudentSelectDto {
  @IsString()
  @IsNotEmpty()
  seasonId!: string

  @IsString()
  @IsNotEmpty()
  componentId!: string
}
