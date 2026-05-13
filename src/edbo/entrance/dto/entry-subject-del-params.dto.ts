import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class EntrySubjectDelParamsDto {
  @ApiProperty({ description: 'Код вступного випробування / показника' })
  @IsInt()
  universitySpecialitySubjectId!: number;

}
