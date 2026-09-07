import {
	BadRequestException,
	ConflictException,
	Injectable
} from '@nestjs/common'
import { Prisma, UserRole } from '@prisma/client'
import { randomBytes } from 'crypto'

import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'

import { TEACHER_LINKABLE_ROLES } from './admin.constants'
import { AdminDashboardStatsDto } from './dto/admin-dashboard-stats.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { LinkTeacherDto } from './dto/link-teacher.dto'
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto'

/**
 * Сервіс для управління користувачами адміністратором.
 */
@Injectable()
export class AdminService {
	/**
	 * Конструктор сервісу адміністратора.
	 * @param userService - Сервіс для роботи з користувачами.
	 * @param mailService - Сервіс для відправки email-повідомлень.
	 */
	public constructor(
		private readonly userService: UserService,
		private readonly mailService: MailService,
		private readonly prisma: PrismaService
	) {}

	/**
	 * Повертає список всіх користувачів.
	 * @returns Список користувачів.
	 */
	public async findAll() {
		return this.userService.findAll()
	}

	/**
	 * Повертає користувача за ID.
	 * @param id - ID користувача.
	 * @returns Знайдений користувач.
	 * @throws NotFoundException - Якщо користувача не знайдено.
	 */
	public async findById(id: string) {
		return this.userService.findById(id)
	}

	/**
	 * Створює нового користувача.
	 * Генерує тимчасовий пароль і відправляє його на email.
	 * @param dto - Дані для створення користувача.
	 * @returns Створений користувач.
	 * @throws ConflictException - Якщо користувач з таким email вже існує.
	 */
	public async create(dto: CreateUserDto) {
		const existingUser = await this.userService.findByEmail(dto.email)

		if (existingUser) {
			throw new ConflictException('Користувач з таким Email вже існує.')
		}

		if (dto.role === UserRole.STUDENT) {
			const student = await this.prisma.student.findUnique({
				where: { id: dto.studentId }
			})
			if (!student) throw new BadRequestException('Студента не знайдено.')
			if (student.userId)
				throw new ConflictException(
					"Цей студент вже прив'язаний до іншого акаунту."
				)
		}

		if (dto.teacherId) {
			const teacher = await this.prisma.teacher.findUnique({
				where: { id: dto.teacherId }
			})
			if (!teacher)
				throw new BadRequestException('Викладача не знайдено.')
			if (teacher.userId)
				throw new ConflictException(
					"Цей викладач вже прив'язаний до іншого акаунту."
				)
		}

		const tempPassword = randomBytes(8).toString('hex')
		const user = await this.userService.create(
			dto.email,
			tempPassword,
			dto.role
		)

		if (dto.role === UserRole.STUDENT && dto.studentId) {
			await this.prisma.student.update({
				where: { id: dto.studentId },
				data: { userId: user.id }
			})
		}

		if (dto.teacherId) {
			await this.prisma.teacher.update({
				where: { id: dto.teacherId },
				data: { userId: user.id }
			})
		}

		await this.mailService.sendTempPassword(user.email, tempPassword)

		return user
	}

	public async findUnlinkedStudents() {
		return this.prisma.student.findMany({
			where: { userId: null },
			select: {
				id: true,
				personFIO: true,
				groupName: true,
				courseName: true
			},
			orderBy: { personFIO: 'asc' }
		})
	}

	public async findUnlinkedTeachers() {
		return this.prisma.teacher.findMany({
			where: { userId: null },
			select: {
				id: true,
				lastName: true,
				firstName: true,
				middleName: true,
				positionName: true
			},
			orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
		})
	}

	/**
	 * Оновлює дані користувача.
	 * @param id - ID користувача.
	 * @param dto - Дані для оновлення користувача.
	 * @returns Оновлений користувач.
	 */
	public async update(id: string, dto: UpdateUserByAdminDto) {
		await this.userService.findById(id)

		return this.userService.updateByAdmin(id, dto)
	}

	/**
	 * Зведені лічильники для головної сторінки адміністратора.
	 * Лише агрегати (count/groupBy) — списки не вивантажуються.
	 */
	public async getDashboardStats(): Promise<AdminDashboardStatsDto> {
		// «Навчається» — та сама умова, що й у списку студентів.
		const studying: Prisma.StudentWhereInput = {
			expelEducationTypeName: null,
			academicLeaveTypeName: null,
			OR: [
				{ educationDateEnd: null },
				{ educationDateEnd: { gte: new Date() } }
			]
		}

		const [
			usersTotal,
			usersActive,
			usersNeverLoggedIn,
			usersByRoleRaw,
			studentsTotal,
			studentsStudying,
			studentsWithAccount,
			teachersTotal,
			teachersActive,
			teachersWithAccount,
			groupsTotal,
			groupsArchived,
			groupsWithoutCurator
		] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({ where: { isActive: true } }),
			this.prisma.user.count({ where: { isFirstLogin: true } }),
			this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
			this.prisma.student.count(),
			this.prisma.student.count({ where: studying }),
			this.prisma.student.count({ where: { userId: { not: null } } }),
			this.prisma.teacher.count(),
			this.prisma.teacher.count({ where: { isActive: true } }),
			this.prisma.teacher.count({ where: { userId: { not: null } } }),
			this.prisma.group.count(),
			this.prisma.group.count({ where: { archivedAt: { not: null } } }),
			this.prisma.group.count({
				where: { curatorId: null, archivedAt: null }
			})
		])

		const byRole = Object.fromEntries(
			Object.values(UserRole).map(role => [role, 0])
		) as Record<UserRole, number>
		for (const row of usersByRoleRaw) {
			byRole[row.role] = row._count._all
		}

		return {
			users: {
				total: usersTotal,
				active: usersActive,
				inactive: usersTotal - usersActive,
				neverLoggedIn: usersNeverLoggedIn,
				byRole
			},
			students: {
				total: studentsTotal,
				studying: studentsStudying,
				withAccount: studentsWithAccount
			},
			teachers: {
				total: teachersTotal,
				active: teachersActive,
				withAccount: teachersWithAccount
			},
			groups: {
				total: groupsTotal,
				active: groupsTotal - groupsArchived,
				archived: groupsArchived,
				withoutCurator: groupsWithoutCurator
			}
		}
	}

	/**
	 * Прив'язує картку викладача (ЄДЕБО) до акаунту або відв'язує її (`teacherId: null`).
	 * Зв'язок 1:1 — попередня картка цього акаунту звільняється автоматично.
	 *
	 * @param id - ID користувача.
	 * @param dto - Картка викладача або null.
	 * @returns Оновлений користувач із профілем викладача.
	 * @throws BadRequestException - Роль не підтримує зв'язок або викладача не знайдено.
	 * @throws ConflictException - Викладач уже прив'язаний до іншого акаунту.
	 */
	public async linkTeacher(id: string, dto: LinkTeacherDto) {
		const user = await this.userService.findById(id)

		if (!TEACHER_LINKABLE_ROLES.includes(user.role)) {
			throw new BadRequestException(
				"Прив'язка викладача доступна лише для ролей: викладач, завідувач відділення, заступник директора, директор, адміністратор."
			)
		}

		if (dto.teacherId) {
			const teacher = await this.prisma.teacher.findUnique({
				where: { id: dto.teacherId },
				select: { id: true, userId: true }
			})
			if (!teacher) {
				throw new BadRequestException('Викладача не знайдено.')
			}
			if (teacher.userId && teacher.userId !== id) {
				throw new ConflictException(
					"Цей викладач вже прив'язаний до іншого акаунту."
				)
			}
		}

		await this.prisma.$transaction(async tx => {
			// Звільняємо попередню картку акаунту (зв'язок 1:1 — Teacher.userId @unique).
			await tx.teacher.updateMany({
				where: { userId: id },
				data: { userId: null }
			})
			if (dto.teacherId) {
				await tx.teacher.update({
					where: { id: dto.teacherId },
					data: { userId: id }
				})
			}
		})

		return this.userService.findById(id)
	}

	/**
	 * Деактивує користувача.
	 * @param id - ID користувача.
	 * @returns Деактивований користувач.
	 */
	public async deactivate(id: string) {
		await this.userService.findById(id)

		return this.userService.updateByAdmin(id, { isActive: false })
	}
}
