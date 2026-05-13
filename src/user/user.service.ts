import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { hash, verify } from 'argon2'

import { PrismaService } from '@/prisma/prisma.service'

import { UpdateUserDto } from './dto/update-user.dto'
import { randomBytes } from 'crypto'
import { MailService } from '@/libs/mail/mail.service'
import { UpdateUserByAdminDto } from '@/admin/dto/update-user-by-admin.dto'

/**
 * Сервіс для роботи з користувачами.
 */
@Injectable()
export class UserService {
  /**
   * Конструктор сервісу користувачів.
   * @param prismaService - Сервіс для роботи з базою даних Prisma.
   */
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService
  ) {}

  /**
   * Знаходить користувача за ID.
   * @param {string} id - ID користувача.
   * @returns {Promise<User>} Знайдений користувач.
   * @throws {NotFoundException} Якщо користувача не знайдено.
   */
  public async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id }
    })

    if (!user) {
      throw new NotFoundException(
        'Користувача не знайдено. Будь ласка, перевірте введені дані.'
      )
    }

    return user
  }

  /**
   * Знаходить користувача за Email.
   * @param {string} email - Email користувача.
   * @returns {Promise<User | null>} Знайдений користувач або null, якщо не знайдено.
   */
  public async findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email }
    })
  }

  /**
   * Створює нового користувача.
   * @param email - Email користувача.
   * @param password - Пароль користувача (вже захешований або тимчасовий).
   * @param role - Роль користувача в системі.
   * @returns Створений користувач.
   */
  public async create(email: string, password: string, role: UserRole) {
    return this.prismaService.user.create({
      data: {
        email,
        password: await hash(password),
        role
      }
    })
  }

  /**
   * Оновлює дані користувача.
   * @param userId - ID користувача.
   * @param dto - Дані для оновлення користувача.
   * @returns Оновлений користувач.
   */
  public async update(userId: string, dto: UpdateUserDto) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        ...(dto.email && { email: dto.email }),
        ...(dto.isTwoFactorEnabled !== undefined && {
          isTwoFactorEnabled: dto.isTwoFactorEnabled
        })
      }
    })
  }

  /**
	 * Змінює пароль користувача самостійно.
	 * @param userId - ID користувача.
	 * @param currentPassword - Поточний пароль.
	 * @param newPassword - Новий пароль.
	 * @returns Оновлений користувач.
	 * @throws UnauthorizedException - Якщо поточний пароль невірний.
	 */
	public async changePassword(
	userId: string,
	currentPassword: string,
	newPassword: string
	) {
	const user = await this.findById(userId)

	const isValidPassword = await verify(user.password, currentPassword)

	if (!isValidPassword) {
		throw new UnauthorizedException(
		'Поточний пароль невірний. Будь ласка, спробуйте ще раз.'
		)
	}

	return this.prismaService.user.update({
		where: { id: userId },
		data: {
		password: await hash(newPassword),
		isFirstLogin: false
		}
	})
	}

	/**
	 * Скидає пароль користувача адміністратором.
	 * Генерує тимчасовий пароль і відправляє на email користувача.
	 * @param targetUserId - ID користувача якому скидають пароль.
	 * @returns Оновлений користувач.
	 */
	public async resetPasswordByAdmin(targetUserId: string) {
	const user = await this.findById(targetUserId)

	const tempPassword = randomBytes(8).toString('hex')

	const updated = await this.prismaService.user.update({
		where: { id: targetUserId },
		data: {
		password: await hash(tempPassword),
		isFirstLogin: true
		}
	})

	await this.mailService.sendTempPassword(user.email, tempPassword)

	return updated
	}

	/**
	 * Повертає список всіх користувачів.
	 * @returns Список користувачів.
	 */
	public async findAll() {
	return this.prismaService.user.findMany({
		orderBy: { createdAt: 'desc' }
	})
	}

	/**
	 * Оновлює дані користувача адміністратором.
	 * @param userId - ID користувача.
	 * @param dto - Дані для оновлення.
	 * @returns Оновлений користувач.
	 */
	public async updateByAdmin(userId: string, dto: UpdateUserByAdminDto) {
	return this.prismaService.user.update({
		where: { id: userId },
		data: {
		...(dto.email && { email: dto.email }),
		...(dto.role && { role: dto.role }),
		...(dto.isActive !== undefined && { isActive: dto.isActive })
		}
	})
	}

}