import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonRequestCategoryListItemDto {
  @ApiProperty({ description: 'ID запису про категорію заяви', example: 1 })
  personRequestCategoryId!: number;

  @ApiProperty({ description: 'ID категорії (довідник ENT_PersonSpecialCategory)', example: 3 })
  privilegeCategoryId!: number;

  @ApiPropertyOptional({
    description: 'Назва категорії',
    example: 'Учасник бойових дій',
    nullable: true,
  })
  privilegeCategoryName!: string | null;

  @ApiPropertyOptional({
    description: 'Дата створення запису',
    type: String,
    format: 'date-time',
    example: '2024-07-01T10:00:00+03:00',
    nullable: true,
  })
  createDate!: string | null;

  @ApiPropertyOptional({
    description: 'ID користувача, який створив запис (null якщо додано вступником при подачі електронної заяви)',
    example: 42,
    nullable: true,
  })
  createUserId!: number | null;

  @ApiPropertyOptional({
    description: 'ПІБ користувача або позначка що додано вступником при подачі електронної заяви',
    example: 'Додано вступником при подачі електронної заяви',
    nullable: true,
  })
  fio!: string | null;
}

export type PersonRequestCategoryListResponseDto = PersonRequestCategoryListItemDto[];
