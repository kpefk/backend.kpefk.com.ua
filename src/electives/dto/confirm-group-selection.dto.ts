import { IsDateString, IsOptional, IsString } from 'class-validator'

export class ConfirmGroupSelectionDto {
  /// Явний вибір компонента адміністратором.
  /// Якщо не вказано — береться найпопулярніший добровільний вибір групи
  /// за умови кворуму ≥75% (§3.6 Положення).
  @IsOptional()
  @IsString()
  componentId?: string

  /// §3.4 — реквізити наказу. Обов'язкові, якщо підсумок фіксується
  /// без досягнення кворуму заявами.
  @IsOptional()
  @IsString()
  orderNumber?: string

  @IsOptional()
  @IsDateString()
  orderDate?: string
}
