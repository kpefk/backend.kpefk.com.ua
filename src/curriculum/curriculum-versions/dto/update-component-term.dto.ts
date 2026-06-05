import { PartialType } from '@nestjs/swagger'
import { CreateComponentTermDto } from './create-component-term.dto'

export class UpdateComponentTermDto extends PartialType(CreateComponentTermDto) {}
