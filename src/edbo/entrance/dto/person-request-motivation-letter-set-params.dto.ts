import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength } from 'class-validator';

export class PersonRequestMotivationLetterSetParamsDto {
  @ApiProperty({ description: 'Текст мотиваційного листа (максимум 20000 символів)', maxLength: 20000 })
  @IsString()
  @MaxLength(20000)
  motivationLetterText!: string;

  @ApiProperty({ description: 'Код заяви' })
  @IsInt()
  personRequestId!: number;
}
