import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class PersonRequestOriginalDocumentsUpdateParamsDto {
  @ApiProperty({ description: 'Код заяви' })
  @IsString()
  personRequestId!: string;

  @ApiProperty({ description: 'Чи надані оригінали документів' })
  @IsBoolean()
  isOriginalDocumentsAdded!: boolean;

  @ApiProperty({ description: 'Подано довiдку про мiсце знаходження оригiналiв документiв' })
  @IsBoolean()
  informationOriginalDocumentLocation!: boolean;

  @ApiPropertyOptional({ description: 'Черговiсть в рейтинговому списку, серед вступникiв з однаковим конкурсним балом' })
  @IsInt()
  @IsOptional()
  enrollPriority?: number;

  @ApiPropertyOptional({ description: 'Номер (шифр) особової справи' })
  @IsString()
  @IsOptional()
  personalCode?: string;

}
