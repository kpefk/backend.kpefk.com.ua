import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class EntrySubjectListParamsDto {
  @ApiProperty({ description: 'Код конкурсної пропозиції' })
  @IsInt()
  universitySpecialitiesId!: number;

}
