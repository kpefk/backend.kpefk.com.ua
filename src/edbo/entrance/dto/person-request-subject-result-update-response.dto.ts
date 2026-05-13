import { ApiProperty } from '@nestjs/swagger';

/** Відповідь /personRequest/subjectResult/update — новий конкурсний бал */
export class PersonRequestSubjectResultUpdateResponseDto {
  @ApiProperty({ description: 'Новий конкурсний бал заяви після змін' })
  competitiveScore!: number;
}
