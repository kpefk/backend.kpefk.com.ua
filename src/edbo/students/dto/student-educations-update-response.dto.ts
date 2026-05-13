import { ApiProperty } from '@nestjs/swagger';

export class StudentEducationsUpdateResponseDto {
  @ApiProperty({
    description: 'Результат виконання операції оновлення',
    example: 'OK',
  })
  result!: string;
}
