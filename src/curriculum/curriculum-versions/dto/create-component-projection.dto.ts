import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator'

/**
 * Тіло запиту для створення відображення компонента в додатковому розділі.
 * Обидва UUID повинні належати до версії навчального плану, вказаної в URL.
 */
export class CreateComponentProjectionDto {
  /** UUID канонічного освітнього компонента (основний розділ) */
  @IsUUID()
  componentId!: string

  /** UUID цільового розділу (не може збігатися з основним розділом компонента) */
  @IsUUID()
  targetSectionId!: string

  /** Порядок відображення в межах цільового розділу (за замовчуванням 0) */
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number

  /** Маркер-позначка поруч з назвою компонента, наприклад «*» */
  @IsOptional()
  @IsString()
  displayMarker?: string

  /** Пояснювальна нотатка, наприклад «Інтегровано з ОК3» */
  @IsOptional()
  @IsString()
  displayNote?: string
}
