import { ApiPropertyOptional } from '@nestjs/swagger';

export class PersonRequestCertificateZNOListResponseDto {
  @ApiPropertyOptional({ description: 'Ід запису про оцінку сертифікату ЗНО особи' })
  personDocumentSubjectId?: number | null;

  @ApiPropertyOptional({ description: 'Рік отримання сертифікату ЗНО' })
  certYear?: number | null;

  @ApiPropertyOptional({ description: 'Номер сертифікату ЗНО' })
  documentNumbers?: string | null;

  @ApiPropertyOptional({ description: 'Ід документу особи - сертифікату ЗНО' })
  personDocumentId?: number | null;

  @ApiPropertyOptional({ description: 'Бал за іспит ЗНО з предмету' })
  personDocumentSubjectValue?: number | null;

  @ApiPropertyOptional({ description: 'Ід предмету' })
  subjectId?: number | null;

  @ApiPropertyOptional({ description: 'Стрічковий код предмету' })
  subjectKey?: string | null;

  @ApiPropertyOptional({ description: 'Назва предмету' })
  subjectName?: string | null;
}
