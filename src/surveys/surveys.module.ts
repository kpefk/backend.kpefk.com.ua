import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { SurveysController } from './surveys.controller'
import { SurveysService } from './surveys.service'

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {}
