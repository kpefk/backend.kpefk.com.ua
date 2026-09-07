import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

/** Зведені лічильники для головної сторінки адміністратора. */
export class AdminDashboardStatsDto {
	@ApiProperty({ description: 'Акаунти системи' })
	users!: {
		total: number
		active: number
		inactive: number
		neverLoggedIn: number
		byRole: Record<UserRole, number>
	}

	@ApiProperty({ description: 'Студенти (ЄДЕБО)' })
	students!: {
		total: number
		studying: number
		withAccount: number
	}

	@ApiProperty({ description: 'Викладачі (ЄДЕБО)' })
	teachers!: {
		total: number
		active: number
		withAccount: number
	}

	@ApiProperty({ description: 'Академічні групи' })
	groups!: {
		total: number
		active: number
		archived: number
		withoutCurator: number
	}
}
