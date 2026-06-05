import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateWorkingCurriculumDto {
  @ApiPropertyOptional({ description: 'Примітки' })
  @IsOptional()
  @IsString()
  notes?: string
}
