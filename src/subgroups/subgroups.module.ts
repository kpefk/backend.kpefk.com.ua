import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'
import { ScheduleModule } from '@/schedule/schedule.module'

import { SubgroupsController } from './subgroups.controller'
import { SubgroupsService } from './subgroups.service'

@Module({
  imports: [PrismaModule, UserModule, ScheduleModule],
  controllers: [SubgroupsController],
  providers: [SubgroupsService],
  exports: [SubgroupsService],
})
export class SubgroupsModule {}
