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

	@ApiProperty({
		description:
			'Лічильники для чек-листа первинного налаштування. Кожен відповідає ' +
			'одному кроку: 0 = крок не виконано.'
	})
	setup!: {
		/** Картка закладу, підтягнута з ЄДЕБО (`university/get`). */
		university: number
		/** Навчальні кабінети — вводяться вручну. */
		classrooms: number
		specialties: number
		educationalPrograms: number
		/** Опубліковані версії навчальних планів (чернетки не рахуються). */
		publishedCurriculumVersions: number
		/** Активні прив'язки груп до версій планів. */
		groupCurriculumAssignments: number
		/** Робочі навчальні плани на навчальний рік. */
		workingCurricula: number
		/** Записи навантаження, підтверджені наказом директора. */
		confirmedTeacherLoad: number
		/** Опубліковані розклади (видимі студентам і викладачам). */
		publishedSchedules: number
	}
}
