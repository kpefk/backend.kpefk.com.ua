import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export class AttestationDueQueryDto {
	/** Референсний рік для класифікації статусу; за замовчуванням — поточний. */
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(2000)
	@Max(2100)
	year?: number
}
