import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'

export const STUDENT_LIST_STATUSES = ['all', 'active', 'inactive'] as const
export type StudentListStatus = (typeof STUDENT_LIST_STATUSES)[number]

/**
 * Параметри списку студентів.
 * `active` — навчається; `inactive` — завершив / відрахований / в академвідпустці.
 */
export class StudentListQueryDto {
	@ApiPropertyOptional({
		enum: STUDENT_LIST_STATUSES,
		default: 'all',
		description:
			'Фільтр за станом навчання. За замовчуванням — усі студенти.'
	})
	@IsOptional()
	@IsIn(STUDENT_LIST_STATUSES, {
		message: 'status має бути одним із: all, active, inactive.'
	})
	status?: StudentListStatus
}
