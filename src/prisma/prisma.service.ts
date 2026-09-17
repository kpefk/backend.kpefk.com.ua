import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/** Максимум з'єднань у пулі; перевизначається через DATABASE_POOL_MAX. */
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 10)

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	public constructor() {
		const adapter = new PrismaPg({
			connectionString: process.env.POSTGRES_URI,
			// Явний розмір пулу замість дефолтних 10 у node-postgres.
			// Рахується від сторони БД, а не застосунку: сумарно
			// POOL_MAX × (кількість інстансів) має лишатись нижче
			// max_connections у PostgreSQL, інакше нові з'єднання
			// відхиляються ще до того, як застосунок це помітить.
			max: POOL_MAX,
			// Не тримаємо простоюючі з'єднання вічно і не чекаємо на вільне
			// з'єднання нескінченно — інакше вичерпаний пул виглядає як
			// «запити просто зависли».
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 10_000
		})
		super({ adapter })
	}

	public async onModuleInit(): Promise<void> {
		await this.$connect()
	}

	public async onModuleDestroy(): Promise<void> {
		await this.$disconnect()
	}
}
