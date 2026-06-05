import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

export class CreateElectiveBlockDto {
  @ApiProperty({ description: 'Назва блоку', example: 'Блок вільного вибору 4 семестр' })
  @IsString()
  @MinLength(2)
  @MaxLength(512)
  name!: string

  @ApiProperty({ description: 'Семестр вибору', example: 4 })
  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number

  @ApiPropertyOptional({ description: 'Мінімальна кількість вибраних', default: 1 })
  @IsInt()
  @Min(1)
  minSelections!: number

  @ApiPropertyOptional({ description: 'Максимальна кількість вибраних', default: 1 })
  @IsInt()
  @Min(1)
  maxSelections!: number

  @ApiProperty({ description: 'Порядок виведення', example: 1 })
  @IsInt()
  @Min(0)
  orderIndex!: number
}
