import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsUUID } from 'class-validator'

export class AssignCuratorDto {
  @ApiPropertyOptional({
    description: 'UUID викладача-куратора. null — зняти куратора.',
    example: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'teacherId повинен бути валідним UUID.' })
  teacherId?: string | null
}
