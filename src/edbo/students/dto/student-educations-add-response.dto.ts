import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentEducationsAddResponseDto {
  @ApiProperty({
    description: 'Код створеної картки здобувача освіти',
    example: 456,
  })
  educationId!: number;

  @ApiPropertyOptional({
    description:
      'Попередження щодо даних картки (наприклад, дублювання запису). ' +
      'Null якщо попереджень немає',
    example: 'Увага: існує інша активна картка для цієї особи',
    nullable: true,
  })
  educationWarning?: string | null;
}
