import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator'

export class CreateWorkingAssignmentDto {
  @ApiProperty({ description: 'UUID академічної групи', example: 'uuid' })
  @IsUUID('4', { message: 'groupId має бути валідним UUID.' })
  groupId!: string

  @ApiProperty({ description: 'UUID робочого навчального плану', example: 'uuid' })
  @IsUUID('4', { message: 'workingCurriculumId має бути валідним UUID.' })
  workingCurriculumId!: string

  @ApiProperty({ description: 'UUID нормативного призначення групи до плану', example: 'uuid' })
  @IsUUID('4', { message: 'assignmentId має бути валідним UUID.' })
  assignmentId!: string

  @ApiPropertyOptional({ description: 'UUID користувача, що виконав призначення' })
  @IsOptional()
  @IsUUID('4')
  assignedBy?: string
}
