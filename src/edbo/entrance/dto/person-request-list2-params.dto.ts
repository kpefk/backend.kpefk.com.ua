import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
	IsArray,
	IsInt,
	IsOptional,
	ValidateNested,
} from 'class-validator'

/** Елемент переліку статусів заяв (ЄДЕБО IdentityListItem). */
export class PersonRequestStatusListItemDto {
	@ApiProperty({ description: 'Ід статусу заяви' })
	@IsInt()
	id!: number
}

export class PersonRequestList2ParamsDto {
	// Identity в ЄДЕБО — числовий ідентифікатор; рядок не біндиться і призводить до
	// «Параметр UniversitySpecialitiesId має бути заповненим».
	@ApiProperty({ description: 'Код конкурсної пропозиції' })
	@IsInt()
	universitySpecialitiesId!: number

	@ApiPropertyOptional({ description: 'Код фізичної особи' })
	@IsInt()
	@IsOptional()
	personId?: number

	@ApiPropertyOptional({ description: 'Номер сторінки' })
	@IsInt()
	@IsOptional()
	p_PageNo?: number

	@ApiPropertyOptional({ description: 'Кількість записів на сторінку' })
	@IsInt()
	@IsOptional()
	p_PageSize?: number

	@ApiPropertyOptional({
		description:
			'Перелік статусів заяв. Для отримання заяв з усіма статусами передайте пустий масив []',
		type: [PersonRequestStatusListItemDto]
	})
	@IsArray()
	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => PersonRequestStatusListItemDto)
	statusesList?: PersonRequestStatusListItemDto[]
}
