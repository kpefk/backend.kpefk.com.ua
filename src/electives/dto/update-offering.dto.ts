import { IsOptional, IsBoolean, IsString, IsUrl } from 'class-validator'

export class UpdateOfferingDto {
  @IsOptional()
  @IsUrl()
  syllabusUrl?: string

  @IsOptional()
  @IsBoolean()
  isHigherEd?: boolean

  @IsOptional()
  @IsString()
  description?: string
}
