import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
	IsDateString,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength
} from 'class-validator'

/**
 * Реквізити затвердження навчального плану.
 *
 * Наказ МОН № 510, п. 5.11 абз. 2: «Вимоги до структури, змісту й оформлення
 * навчальних планів, порядок розроблення, затвердження та внесення змін
 * визначаються Положенням». Публікація версії в системі = введення плану в дію,
 * тож реквізити затвердження фіксуються обов'язково.
 */
export class PublishCurriculumVersionDto {
	@ApiProperty({
		description:
			'Номер наказу (рішення) про затвердження навчального плану',
		example: '112-од'
	})
	@IsString({ message: 'approvalOrderNumber має бути рядком.' })
	@IsNotEmpty({ message: 'Вкажіть номер наказу про затвердження плану.' })
	@MaxLength(64)
	approvalOrderNumber!: string

	@ApiProperty({
		description: 'Дата наказу (рішення) про затвердження',
		example: '2026-08-28'
	})
	@IsDateString(
		{},
		{ message: 'approvalDate має бути датою у форматі ISO 8601.' }
	)
	approvalDate!: string

	@ApiProperty({
		description:
			'Ким затверджено — колегіальний орган управління або посадова особа',
		example: 'Педагогічна рада, протокол № 1 від 28.08.2026'
	})
	@IsString({ message: 'approvedBy має бути рядком.' })
	@IsNotEmpty({ message: 'Вкажіть, ким затверджено навчальний план.' })
	@MaxLength(255)
	approvedBy!: string

	@ApiPropertyOptional({
		description:
			'Обґрунтування публікації попри блокуючі нормативні порушення. ' +
			'Доступно лише директору; фіксується в журналі аудиту разом з переліком порушень.',
		example:
			'План 2024 року вступу, затверджений до впровадження перевірок.'
	})
	@IsOptional()
	@IsString()
	@MaxLength(500)
	overrideReason?: string
}
