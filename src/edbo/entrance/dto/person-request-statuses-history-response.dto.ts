import { ApiPropertyOptional } from '@nestjs/swagger';

export class PersonRequestStatusesHistoryResponseDto {
  @ApiPropertyOptional({ description: 'Код статусу' })
  personRequestStatusTypeId?: number | null;

  @ApiPropertyOptional({ description: 'Дата встановлення статусу' })
  actualDate?: Date | null;

  @ApiPropertyOptional({ description: 'Коментар до статусу' })
  comments?: string | null;
}
