import { ApiProperty } from '@nestjs/swagger';

export class UniversityExamStreamListResponseDto {
  @ApiProperty({ description: 'ID запису про потік' })
  universityExamStreamId!: number;

  @ApiProperty({ description: 'Номер потоку по порядку' })
  streamNumber!: number;

  @ApiProperty({ description: 'Дата та час проведення випробування (потік Х)' })
  universityExamDate!: Date;

  @ApiProperty({ description: 'Місце проведення випробування (потік Х)' })
  universityExamVenue!: string;

  @ApiProperty({ description: 'Кінцева дата реєстрації на участь у вступному випробуванні в межах потоку X' })
  universityExamRequestDateEnd!: Date;

  @ApiProperty({ description: 'Максимальна кількість місць для участі в межах потоку X' })
  universityExamRequestLimit!: number;

  @ApiProperty({ description: 'Кількість поданих заяв на потік (скасовані не враховуються)' })
  requestTotalCount!: number;

  @ApiProperty({ description: 'Кількість підтверджених заяв на потік' })
  requestConfirmedCount!: number;
}