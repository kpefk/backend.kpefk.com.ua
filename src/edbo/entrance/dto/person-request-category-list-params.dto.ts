import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PersonRequestCategoryListParamsDto {
  @ApiProperty({ description: 'ID заяви вступника', example: 1 })
  @IsInt()
  personRequestId!: number;
}
