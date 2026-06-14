import { IsOptional, IsString, IsNotEmpty } from 'class-validator'

export class AutoAssignBulkDto {
  @IsString()
  @IsNotEmpty()
  groupId!: string

  /** Якщо не передано — auto-pick (потребує ≥75% кворуму групи за §3.4) */
  @IsString()
  @IsOptional()
  componentId?: string

  /**
   * Якщо componentId переданий явно — обов'язкове поле (валідується в сервісі).
   * При auto-pick — необов'язкове.
   */
  @IsString()
  @IsOptional()
  overrideReason?: string
}
