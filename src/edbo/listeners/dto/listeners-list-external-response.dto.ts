import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO для відповіді API для зовнішнього списку слухачів.
 *
 * @class ListenersListExternalResponseDto
 */
export class ListenersListExternalResponseDto {

  /**
   * Код закладу в ЄДЕБО.
   *
   * @type {number}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код закладу в ЄДЕБО', example: 1 })
  @Expose()
  @Type(() => Number)
  universityId!: number;

  /**
   * Код картки фізичної особи в ЄДЕБО.
   *
   * @type {number}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код картки фізичної особи в ЄДЕБО', example: 2 })
  @Expose()
  @Type(() => Number)
  personId!: number;

  /**
   * Код картки слухача в ЄДЕБО.
   *
   * @type {number}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код картки слухача в ЄДЕБО', example: 3 })
  @Expose()
  @Type(() => Number)
  listenerId!: number;

  /**
   * Прізвище.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Прізвище', example: 'Шевченко' })
  @Expose()
  @Type(() => String)
  lastName!: string;

  /**
   * Власне ім'я.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: "Власне ім'я", example: 'Тарас' })
  @Expose()
  @Type(() => String)
  firstName!: string;

  /**
   * По батькові.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'По батькові', example: 'Григорович' })
  @Expose()
  @Type(() => String)
  middleName!: string;

  /**
   * Дата народження.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Дата народження', example: '1991-08-24T17:36:25+03:00' })
  @Expose()
  @Type(() => String)
  birthday!: string;

  /**
   * Громадянство.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Громадянство', example: 'Україна' })
  @Expose()
  @Type(() => String)
  countryName!: string;

  /**
   * Стать.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Стать', example: 'Чоловіча' })
  @Expose()
  @Type(() => String)
  personSexName!: string;

  /**
   * РНОКПП — реєстраційний номер облікової картки платника податків.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'РНОКПП', example: '1234567890' })
  @Expose()
  @Type(() => String)
  rnokpp!: string;

  /**
   * УНЗР — унікальний номер запису в Реєстрі.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'УНЗР', example: '19910824-12345' })
  @Expose()
  @Type(() => String)
  unzr!: string;

  /**
   * Документ, що посвідчує особу — тип (Id).
   *
   * @type {number}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Документ, що посвідчує особу — тип (Id)', example: 1 })
  @Expose()
  @Type(() => Number)
  passportDocumentTypeId!: number;

  /**
   * Документ, що посвідчує особу — тип (назва).
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Документ, що посвідчує особу — тип (назва)', example: 'Паспорт громадянина України' })
  @Expose()
  @Type(() => String)
  passportDocumentTypeName!: string;

  /**
   * Документ, що посвідчує особу — серія.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Документ, що посвідчує особу — серія', example: 'АА' })
  @Expose()
  @Type(() => String)
  passportDocumentSeries!: string;

  /**
   * Документ, що посвідчує особу — номер.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Документ, що посвідчує особу — номер', example: '123456' })
  @Expose()
  @Type(() => String)
  passportDocumentNumbers!: string;

  /**
   * Документ, що посвідчує особу — дата видачі.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Документ, що посвідчує особу — дата видачі', example: '1991-08-24T17:36:25+03:00' })
  @Expose()
  @Type(() => String)
  passportDocumentIssuedDate!: string;

  /**
   * Документ, що посвідчує особу — термін дії.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Документ, що посвідчує особу — термін дії', example: '2031-08-24T17:36:25+03:00' })
  @Expose()
  @Type(() => String)
  passportDocumentExpiredDate!: string;

  /**
   * Код професії 1.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код професії 1', example: '7233.2' })
  @Expose()
  @Type(() => String)
  professionClassifierCode1!: string;

  /**
   * Назва професії 1.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Назва професії 1', example: 'Електрогазозварник' })
  @Expose()
  @Type(() => String)
  professionName1!: string;

  /**
   * Розряд 1.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Розряд 1', example: '4' })
  @Expose()
  @Type(() => String)
  professionRangName1!: string;

  /**
   * Код професії 2.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код професії 2', example: '7233.2', nullable: true })
  @Expose()
  @Type(() => String)
  professionClassifierCode2!: string;

  /**
   * Назва професії 2.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Назва професії 2', example: 'Слюсар', nullable: true })
  @Expose()
  @Type(() => String)
  professionName2!: string;

  /**
   * Розряд 2.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Розряд 2', example: '3', nullable: true })
  @Expose()
  @Type(() => String)
  professionRangName2!: string;

  /**
   * Код професії 3.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код професії 3', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionClassifierCode3!: string;

  /**
   * Назва професії 3.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Назва професії 3', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionName3!: string;

  /**
   * Розряд 3.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Розряд 3', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionRangName3!: string;

  /**
   * Код професії 4.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код професії 4', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionClassifierCode4!: string;

  /**
   * Назва професії 4.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Назва професії 4', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionName4!: string;

  /**
   * Розряд 4.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Розряд 4', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionRangName4!: string;

  /**
   * Код професії 5.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Код професії 5', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionClassifierCode5!: string;

  /**
   * Назва професії 5.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Назва професії 5', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionName5!: string;

  /**
   * Розряд 5.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Розряд 5', example: null, nullable: true })
  @Expose()
  @Type(() => String)
  professionRangName5!: string;

  /**
   * Форма навчання.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Форма навчання', example: 'Денна' })
  @Expose()
  @Type(() => String)
  educationFormName!: string;

  /**
   * Чи дуальна форма навчання.
   *
   * @type {boolean}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Чи дуальна форма навчання', example: false })
  @Expose()
  @Type(() => Boolean)
  isDual!: boolean;

  /**
   * Початок навчання (дата).
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Початок навчання (дата)', example: '1991-08-24T17:36:25+03:00' })
  @Expose()
  @Type(() => String)
  educationDateBegin!: string;

  /**
   * Початок навчання (наказ) — повертаються дані з поля "Підстава".
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Початок навчання (наказ / підстава)', example: 'Наказ №123 від 01.09.2021' })
  @Expose()
  @Type(() => String)
  reason!: string;

  /**
   * Закінчення навчання (дата).
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Закінчення навчання (дата)', example: '1993-06-30T00:00:00+03:00' })
  @Expose()
  @Type(() => String)
  educationDateEnd!: string;

  /**
   * Дата створення картки слухача.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Дата створення картки слухача', example: '1991-08-24T17:36:25+03:00' })
  @Expose()
  @Type(() => String)
  createDate!: string;

  /**
   * Дата останнього редагування картки слухача.
   *
   * @type {string}
   * @memberof ListenersListExternalResponseDto
   */
  @ApiProperty({ description: 'Дата останнього редагування картки слухача', example: '1991-08-24T17:36:25+03:00' })
  @Expose()
  @Type(() => String)
  modifyDate!: string;
}