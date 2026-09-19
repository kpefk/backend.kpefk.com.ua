/**
 * Первинне налаштування: маршрут створення адміністратора має бути відкритий
 * рівно один раз — поки в системі немає жодного користувача.
 *
 * Тести на моках Prisma, без БД.
 * Run: bun run test -- setup.service.spec.ts
 */
import { ConflictException } from '@nestjs/common'
import { Prisma, UserRole } from '@prisma/client'

import type { PrismaService } from '@/prisma/prisma.service'

import { SetupService } from './setup.service'

/** Дані, з якими сервіс створює користувача (підмножина Prisma.UserCreateInput). */
interface CapturedUser {
	email: string
	password: string
	role: UserRole
	isActive: boolean
	isFirstLogin: boolean
}

/** Дані запису в журнал аудиту. */
interface CapturedAudit {
	action: string
	targetType: string
	targetId: string
	ipAddress: string | null
}

interface Harness {
	service: SetupService
	/** Користувачі, яких сервіс намагався створити. */
	users: CapturedUser[]
	/** Записи, які сервіс намагався внести в журнал. */
	audit: CapturedAudit[]
}

/**
 * Prisma-мок: `$transaction(fn)` виконує callback із підставним tx і записує
 * аргументи create-викликів у типізовані масиви — так перевірки не лізуть
 * у `mock.calls`, що приходить нетипізованим.
 */
function harness(options: {
	userCount: number
	transactionError?: Error
}): Harness {
	const users: CapturedUser[] = []
	const audit: CapturedAudit[] = []

	const tx = {
		user: {
			count: async (): Promise<number> => options.userCount,
			create: async (args: {
				data: CapturedUser
			}): Promise<{ id: string; email: string; role: UserRole }> => {
				users.push(args.data)
				return {
					id: 'user-1',
					email: args.data.email,
					role: args.data.role
				}
			}
		},
		auditLog: {
			create: async (args: { data: CapturedAudit }): Promise<object> => {
				audit.push(args.data)
				return {}
			}
		}
	}

	const prisma = {
		user: { count: async (): Promise<number> => options.userCount },
		$transaction: async (
			fn: (t: typeof tx) => Promise<unknown>
		): Promise<unknown> => {
			if (options.transactionError) throw options.transactionError
			return fn(tx)
		}
	} as unknown as PrismaService

	return { service: new SetupService(prisma), users, audit }
}

/** Перший захоплений запис; падає з осмисленим повідомленням, якщо його немає. */
function first<T>(items: T[], label: string): T {
	const item = items[0]
	if (item === undefined) throw new Error(`${label}: запис не створено`)
	return item
}

const VALID_DTO = {
	email: 'Admin@KPEFK.com.ua',
	password: 'Admin2026pass'
}

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
	return new Prisma.PrismaClientKnownRequestError(code, {
		code,
		clientVersion: '7.0.0'
	})
}

describe('SetupService.getStatus', () => {
	it('порожня система потребує налаштування', async () => {
		const { service } = harness({ userCount: 0 })
		await expect(service.getStatus()).resolves.toEqual({ needsSetup: true })
	})

	it('за наявності користувачів налаштування не потрібне', async () => {
		const { service } = harness({ userCount: 3 })
		await expect(service.getStatus()).resolves.toEqual({
			needsSetup: false
		})
	})
})

describe('SetupService.createFirstAdministrator', () => {
	it('на порожній системі створює адміністратора', async () => {
		const { service, users } = harness({ userCount: 0 })

		const result = await service.createFirstAdministrator(
			VALID_DTO,
			'127.0.0.1'
		)
		expect(result.role).toBe(UserRole.ADMINISTRATOR)

		const created = first(users, 'user')
		expect(created.role).toBe(UserRole.ADMINISTRATOR)
		expect(created.isActive).toBe(true)
		// Пароль задав сам користувач — примусова зміна при першому вході зайва.
		expect(created.isFirstLogin).toBe(false)
	})

	it('email нормалізується до нижнього регістру', async () => {
		const { service, users } = harness({ userCount: 0 })
		await service.createFirstAdministrator(VALID_DTO, null)
		expect(first(users, 'user').email).toBe('admin@kpefk.com.ua')
	})

	it('пароль зберігається хешованим, а не відкритим текстом', async () => {
		const { service, users } = harness({ userCount: 0 })
		await service.createFirstAdministrator(VALID_DTO, null)

		const stored = first(users, 'user').password
		expect(stored).not.toBe(VALID_DTO.password)
		expect(stored).toMatch(/^\$argon2/)
	})

	it('факт створення фіксується в журналі аудиту', async () => {
		const { service, audit } = harness({ userCount: 0 })
		await service.createFirstAdministrator(VALID_DTO, '10.0.0.7')

		const entry = first(audit, 'audit')
		expect(entry.action).toBe('CREATE_FIRST_ADMINISTRATOR')
		expect(entry.ipAddress).toBe('10.0.0.7')
	})

	it('якщо користувачі вже є — 409 і жодного запису', async () => {
		const { service, users } = harness({ userCount: 1 })

		await expect(
			service.createFirstAdministrator(VALID_DTO, null)
		).rejects.toBeInstanceOf(ConflictException)

		expect(users).toHaveLength(0)
	})

	it('конкурентний запит (Serializable, P2034) → 409, а не 500', async () => {
		const { service } = harness({
			userCount: 0,
			transactionError: prismaError('P2034')
		})

		await expect(
			service.createFirstAdministrator(VALID_DTO, null)
		).rejects.toBeInstanceOf(ConflictException)
	})

	it('дублікат email (P2002) → 409, а не 500', async () => {
		const { service } = harness({
			userCount: 0,
			transactionError: prismaError('P2002')
		})

		await expect(
			service.createFirstAdministrator(VALID_DTO, null)
		).rejects.toBeInstanceOf(ConflictException)
	})

	it('непередбачена помилка не маскується під 409', async () => {
		const { service } = harness({
			userCount: 0,
			transactionError: new Error('БД недоступна')
		})

		await expect(
			service.createFirstAdministrator(VALID_DTO, null)
		).rejects.toThrow('БД недоступна')
	})
})
