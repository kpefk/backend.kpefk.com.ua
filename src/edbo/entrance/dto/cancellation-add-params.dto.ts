import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CancellationAddParamsDto {
  @ApiProperty({ description: 'Код закладу освіти', example: 1 })
  @IsInt()
  universityId!: number;

  @ApiProperty({
    description: 'Коментар до акту про допущені технічні помилки',
    example: 'Технічна помилка при внесенні даних вступника',
  })
  @IsString()
  requestCancellationDescription!: string;
}
