import { ApiPropertyOptional } from '@nestjs/swagger';

export class PersonRequestOlympiadsListResponseDto {
  @ApiPropertyOptional({ description: 'Id запису олімпіади персони' })
  olympiadPersonId?: number | null;

  @ApiPropertyOptional({ description: 'Тип конкурсу' })
  olympiadName?: string | null;

  @ApiPropertyOptional({ description: 'Код предмету олімпіади' })
  olympiadSubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Код олімпіади' })
  olympiadId?: number | null;

  @ApiPropertyOptional({ description: 'Назва предмету олімпіади' })
  subjectName?: string | null;

  @ApiPropertyOptional({ description: "Ім'я" })
  firstName?: string | null;

  @ApiPropertyOptional({ description: 'Прізвище' })
  lastName?: string | null;

  @ApiPropertyOptional({ description: 'По батькові' })
  middleName?: string | null;

  @ApiPropertyOptional({ description: 'Серія сертифікату' })
  certificateSeries?: string | null;

  @ApiPropertyOptional({ description: 'Номер сертифікату' })
  certificateNumber?: string | null;

  @ApiPropertyOptional({ description: 'Рівень сертифікату' })
  certificateLevel?: string | null;

  @ApiPropertyOptional({ description: 'Клас' })
  class?: string | null;

  @ApiPropertyOptional({ description: 'Школа' })
  schoolName?: string | null;

  @ApiPropertyOptional({ description: 'Рік вступної кампанії (сезону)' })
  olyYear?: number | null;

  @ApiPropertyOptional({ description: 'Назва олімпіади / інша характеристика' })
  olympiadTitle?: string | null;
}
