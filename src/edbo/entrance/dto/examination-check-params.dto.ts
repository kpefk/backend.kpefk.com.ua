import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, ValidateNested } from 'class-validator';

class IdentityListItemDto {
  @ApiProperty({ description: 'ID комісії', example: 1 })
  @IsInt()
  id!: number;
}

export class ExaminationCheckParamsDto {
  @ApiProperty({
    description: 'Список ID комісій для перевірки перед видаленням',
    type: [IdentityListItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => IdentityListItemDto)
  examinationList!: IdentityListItemDto[];
}
