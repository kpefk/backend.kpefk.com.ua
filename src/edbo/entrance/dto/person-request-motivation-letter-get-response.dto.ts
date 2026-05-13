import { ApiPropertyOptional } from '@nestjs/swagger';

export class PersonRequestMotivationLetterGetResponseDto {
  @ApiPropertyOptional({ description: 'Текст мотиваційного листа' })
  motivationLetterText?: string | null;
}
