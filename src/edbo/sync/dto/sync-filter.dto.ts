import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsISO8601, IsOptional } from 'class-validator'

export class SyncFilterDto {
	@ApiPropertyOptional({
		example: '2026-05-01T00:00:00.000Z',
		description:
			'Delta-синхронізація від дати (ISO 8601). Якщо не вказано — повна синхронізація.'
	})
	@IsOptional()
	@IsISO8601()
	fromDate?: string
}
