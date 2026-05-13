import { IsArray, IsBoolean, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EnrollPriorityItemDto {
  @IsInt()
  personRequestId!: number;

  @IsInt()
  enrollPriority!: number;
}

export class PersonRequestChangeEnrollPriorityParamsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnrollPriorityItemDto)
  requestEnrollPriorities!: EnrollPriorityItemDto[];

  @IsBoolean()
  @IsOptional()
  isAutoIncEnrollPriority?: boolean;
}