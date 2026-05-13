import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy {
		
	public constructor() {
		const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URI })
		super({ adapter })
	}

	public async onModuleInit(): Promise<void> {
		await this.$connect()
	}

	public async onModuleDestroy(): Promise<void> {
		await this.$disconnect()
	}
}