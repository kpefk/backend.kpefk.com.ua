import { PartialType } from '@nestjs/swagger'
import { CreateEducationalProgramDto } from './create-educational-program.dto'

export class UpdateEducationalProgramDto extends PartialType(CreateEducationalProgramDto) {}
