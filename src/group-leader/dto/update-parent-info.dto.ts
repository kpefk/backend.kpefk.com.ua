import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

const UA_PHONE = /^(\+?38)?0\d{9}$/

function PhoneProp(label: string) {
  return [
    IsOptional(),
    IsString(),
    Matches(UA_PHONE, { message: `${label}: формат +380XXXXXXXXX або 0XXXXXXXXX` }),
  ]
}

export class UpdateParentInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  motherFullName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UA_PHONE, { message: 'motherPhone: формат +380XXXXXXXXX або 0XXXXXXXXX' })
  motherPhone?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  motherWorkplace?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  fatherFullName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UA_PHONE, { message: 'fatherPhone: формат +380XXXXXXXXX або 0XXXXXXXXX' })
  fatherPhone?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  fatherWorkplace?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  guardianFullName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(UA_PHONE, { message: 'guardianPhone: формат +380XXXXXXXXX або 0XXXXXXXXX' })
  guardianPhone?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  guardianWorkplace?: string

  @ApiPropertyOptional({ description: '"бабуся", "дядько" тощо' })
  @IsOptional() @IsString() @MaxLength(100)
  guardianRelation?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  address?: string

  @ApiPropertyOptional({ description: 'Приватні нотатки керівника (не видно студенту)' })
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string
}
