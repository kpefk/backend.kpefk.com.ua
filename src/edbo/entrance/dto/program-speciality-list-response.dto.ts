import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProgramSpecialityListResponseDto {
  @ApiPropertyOptional({ description: '' })
  eduProgramUniSpecialityLinksId?: number | null;

  @ApiPropertyOptional({ description: '' })
  universitySpecialitiesId?: number | null;

  @ApiPropertyOptional({ description: '' })
  universityStudyProgramId?: number | null;

  @ApiPropertyOptional({ description: '' })
  studyProgramName?: string | null;

  @ApiPropertyOptional({ description: '' })
  universitySpecializationId?: number | null;

  @ApiPropertyOptional({ description: '' })
  specializationFullName?: string | null;

  @ApiPropertyOptional({ description: '' })
  masterProgramTypeName?: string | null;

  @ApiPropertyOptional({ description: '' })
  isAccredited?: boolean | null;

}
