import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExaminationCheckResponseDto {
  @ApiPropertyOptional({
    description: 'Попередження перед видаленням (null якщо немає обмежень)',
    example: 'До комісії прив\'язані заяви вступників. Видалення неможливе.',
    nullable: true,
  })
  warningMessage!: string | null;
}
