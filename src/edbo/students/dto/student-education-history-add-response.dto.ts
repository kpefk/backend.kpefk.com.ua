import { ApiProperty } from '@nestjs/swagger';

export class StudentEducationHistoryAddResponseDto {
  @ApiProperty({
    description: 'Результат виконання операції',
    example: 'OK',
  })
  result!: string;
}
