import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { TokenType, UserRole } from '@prisma/client'
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
      where: { id },
      include: {
        student: {
          select: {
            personFIO: true,
            groupName: true
          }
        },
        teacher: {
          select: {
            lastName: true,
            firstName: true,
            middleName: true,
            positionName: true
          }
        }
      }
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
      where: { email },
      include: {
        student: {
          select: {
            personFIO: true,
            groupName: true
          }
        },
        teacher: {
          select: {
            lastName: true,
            firstName: true,
            middleName: true,
            positionName: true
          }
        }
      }
    })
  }

  /**
   * Знаходить користувача за ID з повними даними студента.
   * @param {string} id - ID користувача.
   * @returns Знайдений користувач з розширеними полями студента.
   * @throws {NotFoundException} Якщо користувача не знайдено.
   */
  public async findByIdWithStudentProfile(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            personFIO: true,
            birthday: true,
            groupName: true,
            educationFormName: true,
            courseName: true,
            budgetTransferCategoryName: true,
            qualificationGroupName: true,
            studyProgramName: true,
            educationDateBegin: true
          }
        }
      }
    })

    if (!user) {
      throw new NotFoundException(
        'Користувача не знайдено. Будь ласка, перевірте введені дані.'
      )
    }

    return user
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
        ...(dto.isTwoFactorEnabled !== undefined && {
          isTwoFactorEnabled: dto.isTwoFactorEnabled
        })
      }
    })
  }

  /**
   * Ініціює зміну email: перевіряє пароль, унікальність нової адреси,
   * створює токен підтвердження та надсилає лист на НОВУ адресу.
   * Сам email змінюється лише після підтвердження (confirmEmailChange).
   *
   * @throws UnauthorizedException якщо пароль невірний.
   * @throws ConflictException якщо нова адреса вже зайнята.
   */
  public async requestEmailChange(
    userId: string,
    newEmail: string,
    password: string
  ) {
    const user = await this.findById(userId)

    const isValidPassword = await verify(user.password, password)
    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Невірний пароль. Зміну email скасовано.'
      )
    }

    const normalizedEmail = newEmail.trim().toLowerCase()

    if (normalizedEmail === user.email.toLowerCase()) {
      throw new ConflictException('Нова адреса співпадає з поточною.')
    }

    const existing = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    })
    if (existing) {
      throw new ConflictException('Ця email-адреса вже використовується.')
    }

    // Видаляємо попередні незавершені запити на зміну email для цього юзера.
    await this.prismaService.token.deleteMany({
      where: { userId, type: TokenType.EMAIL_CHANGE }
    })

    const token = randomBytes(32).toString('hex')
    await this.prismaService.token.create({
      data: {
        userId,
        token,
        newEmail: normalizedEmail,
        expiresIn: new Date(Date.now() + 3600 * 1000), // 1 година
        type: TokenType.EMAIL_CHANGE
      }
    })

    await this.mailService.sendEmailChangeConfirmation(normalizedEmail, token)

    return { success: true }
  }

  /**
   * Підтверджує зміну email за токеном з листа.
   *
   * @throws NotFoundException якщо токен не знайдено.
   * @throws BadRequestException якщо токен прострочений.
   * @throws ConflictException якщо нову адресу встигли зайняти.
   */
  public async confirmEmailChange(token: string) {
    const existingToken = await this.prismaService.token.findFirst({
      where: { token, type: TokenType.EMAIL_CHANGE }
    })

    if (!existingToken || !existingToken.newEmail) {
      throw new NotFoundException('Посилання недійсне або вже використане.')
    }

    if (new Date(existingToken.expiresIn) < new Date()) {
      await this.prismaService.token.delete({ where: { id: existingToken.id } })
      throw new BadRequestException('Термін дії посилання вичерпано.')
    }

    // Повторна перевірка унікальності — адресу могли зайняти за час очікування.
    const taken = await this.prismaService.user.findUnique({
      where: { email: existingToken.newEmail },
      select: { id: true }
    })
    if (taken && taken.id !== existingToken.userId) {
      await this.prismaService.token.delete({ where: { id: existingToken.id } })
      throw new ConflictException('Ця email-адреса вже використовується.')
    }

    const updated = await this.prismaService.user.update({
      where: { id: existingToken.userId },
      data: { email: existingToken.newEmail }
    })

    await this.prismaService.token.delete({ where: { id: existingToken.id } })

    return updated
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
		orderBy: { createdAt: 'desc' },
		include: {
			student: {
				select: {
					personFIO: true,
					groupName: true,
				}
			},
			teacher: {
				select: {
					lastName: true,
					firstName: true,
					middleName: true,
					positionName: true,
				}
			}
		}
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