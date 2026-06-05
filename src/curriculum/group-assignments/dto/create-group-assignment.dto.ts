import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateGroupAssignmentDto {
  @ApiProperty({ description: 'UUID академічної групи', example: 'uuid' })
  @IsUUID('4', { message: 'groupId має бути валідним UUID.' })
  groupId!: string

  @ApiProperty({ description: 'UUID навчального плану', example: 'uuid' })
  @IsUUID('4', { message: 'curriculumId має бути валідним UUID.' })
  curriculumId!: string

  @ApiProperty({ description: 'UUID версії навчального плану', example: 'uuid' })
  @IsUUID('4', { message: 'versionId має бути валідним UUID.' })
  versionId!: string

  @ApiProperty({ description: "Дата початку дії прив'язки", example: '2025-09-01' })
  @IsDateString({}, { message: 'effectiveFrom має бути валідною датою (ISO 8601).' })
  effectiveFrom!: string

  @ApiPropertyOptional({ description: 'UUID користувача, що виконав призначення' })
  @IsOptional()
  @IsUUID('4')
  assignedBy?: string

  @ApiPropertyOptional({ description: 'Причина призначення (довільний текст)' })
  @IsOptional()
  @IsString()
  reason?: string
}
