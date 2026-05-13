import { ApiProperty } from '@nestjs/swagger';

export class StudentEducationHistoryDelResponseDto {
  @ApiProperty({
    description: 'Результат виконання операції видалення',
    example: 'OK',
  })
  result!: string;
}
