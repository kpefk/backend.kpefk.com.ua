import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { RatingController } from './rating.controller'
import { RatingService } from './rating.service'

@Module({
	imports: [PrismaModule, UserModule],
	controllers: [RatingController],
	providers: [RatingService]
})
export class RatingModule {}
