import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { UserEntity } from '@/user/entities/user.entity'

import { AdminService } from './admin.service'
import { AdminDashboardStatsDto } from './dto/admin-dashboard-stats.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { LinkTeacherDto } from './dto/link-teacher.dto'
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto'

/**
 * Контролер для управління користувачами адміністратором.
 */
@ApiTags('Адміністратор')
@ApiBearerAuth('access-token')
@Controller('admin')
@Authorization(UserRole.ADMINISTRATOR)
export class AdminController {
	/**
	 * Конструктор контролера адміністратора.
	 * @param adminService - Сервіс для управління користувачами.
	 */
	public constructor(private readonly adminService: AdminService) {}

	/**
	 * Зведені лічильники для головної сторінки адміністратора.
	 * @returns Кількості акаунтів, студентів, викладачів і груп.
	 */
	@ApiOperation({ summary: 'Зведена статистика для головної (адміністратор)' })
	@ApiResponse({ status: 200, description: 'Лічильники системи' })
	@Get('dashboard-stats')
	@HttpCode(HttpStatus.OK)
	public async dashboardStats(): Promise<AdminDashboardStatsDto> {
		return this.adminService.getDashboardStats()
	}

	/**
	 * Повертає список всіх користувачів.
	 * @returns Список користувачів.
	 */
	@ApiOperation({ summary: 'Отримати список всіх користувачів' })
	@ApiResponse({ status: 200, description: 'Список користувачів' })
	@Get('users')
	@HttpCode(HttpStatus.OK)
	public async findAll(): Promise<UserEntity[]> {
		const users = await this.adminService.findAll()
		return users.map(user => new UserEntity(user))
	}

	/**
	 * Повертає користувача за ID.
	 * @param id - ID користувача.
	 * @returns Знайдений користувач.
	 */
	@ApiOperation({ summary: 'Отримати користувача за ID' })
	@ApiResponse({ status: 200, description: 'Знайдений користувач' })
	@ApiResponse({ status: 404, description: 'Користувач не знайдений' })
	@Get('users/:id')
	@HttpCode(HttpStatus.OK)
	public async findById(@Param('id') id: string): Promise<UserEntity> {
		return new UserEntity(await this.adminService.findById(id))
	}

	/**
	 * Створює нового користувача.
	 * @param dto - Дані для створення користувача.
	 * @returns Створений користувач.
	 */
	@ApiOperation({ summary: 'Створити нового користувача' })
	@ApiResponse({ status: 201, description: 'Створений користувач' })
	@ApiResponse({ status: 400, description: 'Невірна капча' })
	@ApiResponse({ status: 403, description: 'Доступ заборонено' })
	@Post('users')
	@HttpCode(HttpStatus.CREATED)
	public async create(@Body() dto: CreateUserDto): Promise<UserEntity> {
		return new UserEntity(await this.adminService.create(dto))
	}

	/**
	 * Оновлює дані користувача.
	 * @param id - ID користувача.
	 * @param dto - Дані для оновлення користувача.
	 * @returns Оновлений користувач.
	 */
	@ApiOperation({ summary: 'Оновити користувача за ID' })
	@ApiResponse({ status: 200, description: 'Оновлений користувач' })
	@ApiResponse({ status: 400, description: 'Невірна капча' })
	@ApiResponse({ status: 403, description: 'Доступ заборонено' })
	@ApiResponse({ status: 404, description: 'Користувач не знайдений' })
	@Patch('users/:id')
	@HttpCode(HttpStatus.OK)
	public async update(
		@Param('id') id: string,
		@Body() dto: UpdateUserByAdminDto
	): Promise<UserEntity> {
		return new UserEntity(await this.adminService.update(id, dto))
	}

	/**
	 * Прив'язує або відв'язує картку викладача для акаунту.
	 * @param id - ID користувача.
	 * @param dto - `teacherId` картки або null для відв'язки.
	 * @returns Оновлений користувач.
	 */
	@ApiOperation({ summary: "Прив'язати / відв'язати викладача до акаунту" })
	@ApiResponse({ status: 200, description: 'Оновлений користувач' })
	@ApiResponse({ status: 400, description: "Роль не підтримує прив'язку" })
	@ApiResponse({ status: 404, description: 'Користувач не знайдений' })
	@ApiResponse({ status: 409, description: "Викладач вже прив'язаний" })
	@Patch('users/:id/teacher')
	@HttpCode(HttpStatus.OK)
	public async linkTeacher(
		@Param('id') id: string,
		@Body() dto: LinkTeacherDto
	): Promise<UserEntity> {
		return new UserEntity(await this.adminService.linkTeacher(id, dto))
	}

	/**
	 * Деактивує користувача.
	 * @param id - ID користувача.
	 * @returns Деактивований користувач.
	 */
	@ApiOperation({ summary: 'Деактивувати користувача за ID' })
	@ApiResponse({ status: 200, description: 'Деактивований користувач' })
	@ApiResponse({ status: 403, description: 'Доступ заборонено' })
	@ApiResponse({ status: 404, description: 'Користувач не знайдений' })
	@Delete('users/:id')
	@HttpCode(HttpStatus.OK)
	public async deactivate(@Param('id') id: string): Promise<UserEntity> {
		return new UserEntity(await this.adminService.deactivate(id))
	}

	@ApiOperation({
		summary: 'Студенти без акаунту (для вибору при створенні)'
	})
	@ApiResponse({ status: 200, description: "Список незв'язаних студентів" })
	@Get('unlinked-students')
	@HttpCode(HttpStatus.OK)
	public async findUnlinkedStudents() {
		return this.adminService.findUnlinkedStudents()
	}

	@ApiOperation({
		summary: 'Викладачі без акаунту (для вибору при створенні)'
	})
	@ApiResponse({ status: 200, description: "Список незв'язаних викладачів" })
	@Get('unlinked-teachers')
	@HttpCode(HttpStatus.OK)
	public async findUnlinkedTeachers() {
		return this.adminService.findUnlinkedTeachers()
	}
}
