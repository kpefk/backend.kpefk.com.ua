import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { Prisma, UserRole } from '@prisma/client'
import { hash } from 'argon2'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateFirstAdministratorDto } from './dto/create-first-administrator.dto'

/** Відповідь `GET /setup/status` — чи потрібне первинне налаштування. */
export interface SetupStatus {
	/** true = у системі немає жодного користувача, форма налаштування доступна. */
	needsSetup: boolean
}

/** Відповідь на успішне створення першого адміністратора. */
export interface FirstAdministratorCreated {
	id: string
	email: string
	role: UserRole
}

@Injectable()
export class SetupService {
	private readonly logger = new Logger(SetupService.name)

	public constructor(private readonly prisma: PrismaService) {}

	/**
	 * Чи потрібне первинне налаштування.
	 *
	 * Критерій — повна відсутність користувачів, а не відсутність саме
	 * адміністратора: інакше після видалення єдиного адміна маршрут відкрився б
	 * знову, і будь-хто зміг би створити собі адмінський акаунт у системі, де
	 * вже є дані здобувачів.
	 */
	public async getStatus(): Promise<SetupStatus> {
		const users = await this.prisma.user.count()
		return { needsSetup: users === 0 }
	}

	/**
	 * Створює першого адміністратора.
	 *
	 * Доступно рівно один раз — поки в системі немає жодного користувача.
	 * Перевірка й запис ідуть в одній транзакції з рівнем `Serializable`:
	 * два паралельні запити на порожню базу інакше створили б двох адміністраторів,
	 * бо обидва побачили б `count() === 0` до запису.
	 */
	public async createFirstAdministrator(
		dto: CreateFirstAdministratorDto,
		ipAddress: string | null
	): Promise<FirstAdministratorCreated> {
		const email = dto.email.trim().toLowerCase()
		const password = await hash(dto.password)

		try {
			const user = await this.prisma.$transaction(
				async tx => {
					const existing = await tx.user.count()
					if (existing > 0) {
						throw new ConflictException(
							'Первинне налаштування вже виконано: у системі є користувачі.'
						)
					}

					const created = await tx.user.create({
						data: {
							email,
							password,
							role: UserRole.ADMINISTRATOR,
							isActive: true,
							// Пароль задав сам користувач, а не адміністратор —
							// вимагати зміни при першому вході немає підстав.
							isFirstLogin: false
						},
						select: { id: true, email: true, role: true }
					})

					await tx.auditLog.create({
						data: {
							userId: created.id,
							action: 'CREATE_FIRST_ADMINISTRATOR',
							targetType: 'User',
							targetId: created.id,
							ipAddress,
							metadata: { email }
						}
					})

					return created
				},
				{
					isolationLevel:
						Prisma.TransactionIsolationLevel.Serializable
				}
			)

			this.logger.warn(
				`Первинне налаштування: створено адміністратора ${email} (ip=${ipAddress ?? '—'})`
			)
			return user
		} catch (error) {
			// Конкурентна транзакція встигла створити користувача першою:
			// Serializable відхиляє нашу (P2034), unique-індекс — дублікат email (P2002).
			// Для клієнта обидва випадки означають одне: налаштування вже виконано.
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				(error.code === 'P2034' || error.code === 'P2002')
			) {
				throw new ConflictException(
					'Первинне налаштування вже виконано: у системі є користувачі.'
				)
			}
			throw error
		}
	}
}
