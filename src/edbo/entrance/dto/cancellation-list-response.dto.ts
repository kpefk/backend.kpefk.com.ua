import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancellationListItemDto {
  @ApiProperty({ description: 'Номер акту', example: 1 })
  requestCancellationId!: number;

  @ApiProperty({
    description: 'Дата створення акту',
    example: '2024-09-01T09:00:00+03:00',
    type: String,
    format: 'date-time',
  })
  dateCreate!: string;

  @ApiProperty({ description: 'Чи сформовано акт', example: false })
  isCreated!: boolean;

  @ApiProperty({
    description: 'Дата останньої зміни',
    example: '2024-09-05T14:30:00+03:00',
    type: String,
    format: 'date-time',
  })
  dateLastChange!: string;

  @ApiPropertyOptional({
    description: 'Коментар до акту',
    example: 'Технічна помилка при внесенні даних',
    nullable: true,
  })
  requestCancellationDescription!: string | null;

  @ApiPropertyOptional({
    description: 'Користувач, що створив акт (ПІБ)',
    example: 'Іваненко Іван Іванович',
    nullable: true,
  })
  fioUserAdd!: string | null;

  @ApiPropertyOptional({
    description: 'Користувач, що вніс останні зміни (ПІБ)',
    example: 'Петренко Петро Петрович',
    nullable: true,
  })
  fioUserEdit!: string | null;
}

export type CancellationListResponseDto = CancellationListItemDto[];
