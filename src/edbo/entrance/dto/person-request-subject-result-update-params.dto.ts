import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class SubjectResultItemDto {
  @ApiProperty({ description: 'Ід КП' })
  @IsInt()
  universitySpecialitySubjectId!: number;

  @ApiPropertyOptional({ description: 'Ід запису про оцінку сертифікату НМТ (ЗНО) особи' })
  @IsInt()
  @IsOptional()
  personDocumentSubjectId?: number;

  @ApiPropertyOptional({ description: 'Ід запису про результат випробування ЄВІ/ЄФВВ' })
  @IsInt()
  @IsOptional()
  znoTechnologySubjectId?: number;

  @ApiPropertyOptional({ description: 'Ід запису про результат ЄДКІ' })
  @IsInt()
  @IsOptional()
  edkiTechnologySubjectId?: number;

  @ApiPropertyOptional({ description: 'Результат' })
  @IsNumber()
  @IsOptional()
  mainScore?: number;

  @ApiPropertyOptional({ description: 'ДБО (Додатковий бал)' })
  @IsNumber()
  @IsOptional()
  additionalScore?: number;

  @ApiPropertyOptional({ description: 'Б200 (Зараховано 200 балів)' })
  @IsBoolean()
  @IsOptional()
  extra200Score?: boolean;
}

export class PersonRequestSubjectResultUpdateParamsDto {
  @ApiProperty({ description: 'Код заяви, що редагується' })
  @IsInt()
  personRequestId!: number;

  @ApiProperty({
    type: [SubjectResultItemDto],
    description: 'Масив результатів випробувань та конкурсних показників. УВАГА! Відсутність випробування трактується як його видалення',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectResultItemDto)
  subjectResult!: SubjectResultItemDto[];

  @ApiPropertyOptional({
    description: 'Чи підтверджено зміну результатів випробувань у іншій заяві вступника',
  })
  @IsBoolean()
  @IsOptional()
  isConfirmedUpdateMirrorMarks?: boolean;
}
