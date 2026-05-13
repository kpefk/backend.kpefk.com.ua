import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PersonRequestOlympiadsListParamsDto {
  @ApiProperty({ description: 'Код фізичної особи' })
  @IsInt()
  personId!: number;

  @ApiProperty({ description: 'ID конкурсної пропозиції' })
  @IsInt()
  universitySpecialitiesId!: number;
}
