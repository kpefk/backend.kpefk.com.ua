import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CancellationUpdateParamsDto {
  @ApiProperty({ description: 'Номер акту про технічні помилки', example: 1 })
  @IsInt()
  requestCancellationId!: number;

  @ApiPropertyOptional({
    description: 'Коментар до акту',
    example: 'Виправлено помилку у прізвищі вступника',
  })
  @IsOptional()
  @IsString()
  requestCancellationDescription?: string;

  @ApiPropertyOptional({
    description: 'Чи сформовано акт',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isCreated?: boolean;
}
