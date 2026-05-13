import { Type } from 'class-transformer'
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

class PhotoOrderItem {
  @ApiProperty({
    description: 'ID файлу',
    example: '1234567890'
  })
  @IsString({ message: 'ID файлу має бути рядком.' })
  googleFileId!: string

  @ApiProperty({
    description: 'Порядок фото',
    example: 1
  })
  @IsInt({ message: 'Порядок фото має бути цілим числом.' })
  order!: number
}

export class ReorderPhotosDto {
  @ApiProperty({
    description: 'Список фото',
    example: [
      {
        googleFileId: '1234567890',
        order: 1
      },
      {
        googleFileId: '0987654321',
        order: 2
      }
    ]
  })
  @IsArray({ message: 'Список фото має бути масивом.' })
  @ValidateNested({ each: true, message: 'Некоректний формат елементу списку фото.' })
  @Type(() => PhotoOrderItem)
  photos!: PhotoOrderItem[]
}