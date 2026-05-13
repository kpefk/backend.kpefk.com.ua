import { ApiProperty } from '@nestjs/swagger';

export class CancellationAddResponseDto {
  @ApiProperty({
    description: 'Код створеного акту про технічні помилки',
    example: 1,
  })
  requestCancellationId!: number;
}
