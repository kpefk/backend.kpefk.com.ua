import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO для параметрів фільтрації зовнішнього списку слухачів.
 *
 * @class ListenersListExternalParamsDto
 */
export class ListenersListExternalParamsDto {

  /**
   * Код слухача.
   *
   * @type {number}
   * @memberof ListenersListExternalParamsDto
   */
  @IsInt()
  @IsOptional()
  listenerId?: number;

  /**
   * РНОКПП — реєстраційний номер облікової картки платника податків.
   *
   * @type {string}
   * @memberof ListenersListExternalParamsDto
   */
  @IsString()
  @IsOptional()
  rnokpp?: string;

  /**
   * Код закладу освіти (ЗО).
   *
   * @type {number}
   * @memberof ListenersListExternalParamsDto
   */
  @IsInt()
  @IsOptional()
  universityId?: number;

  /**
   * Чи активний статус навчання.
   * `0` — неактивний, `1` — активний.
   *
   * @type {number}
   * @memberof ListenersListExternalParamsDto
   */
  @IsInt()
  @IsOptional()
  isActive?: number;

  /**
   * Дата останнього редагування картки слухача.
   * Формат: ISO 8601 (`YYYY-MM-DD`).
   *
   * @type {string}
   * @memberof ListenersListExternalParamsDto
   */
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  /**
   * Номер сторінки результатів.
   * Відлік починається з `0`; кожна сторінка містить до 1000 результатів.
   *
   * @type {number}
   * @required
   * @memberof ListenersListExternalParamsDto
   */
  @IsInt()
  @IsOptional()
  pageNo?: number;
}