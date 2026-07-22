import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'

export class PersonRequestOriginalDocumentsUpdateParamsDto {
	@ApiProperty({ description: 'Код заяви' })
	// ЄДЕБО очікує числовий ідентифікатор (sample: `"personRequestId": 0`); рядок не біндиться.
	@IsInt()
	personRequestId!: number

	@ApiProperty({ description: 'Чи надані оригінали документів' })
	@IsBoolean()
	isOriginalDocumentsAdded!: boolean

	@ApiProperty({
		description:
			'Подано довiдку про мiсце знаходження оригiналiв документiв'
	})
	@IsBoolean()
	informationOriginalDocumentLocation!: boolean

	@ApiPropertyOptional({
		description:
			'Черговiсть в рейтинговому списку, серед вступникiв з однаковим конкурсним балом'
	})
	@IsInt()
	@IsOptional()
	enrollPriority?: number

	@ApiPropertyOptional({ description: 'Номер (шифр) особової справи' })
	@IsString()
	@IsOptional()
	personalCode?: string
}
