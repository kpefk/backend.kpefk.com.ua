import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { GroupLeaderController } from './group-leader.controller'
import { GroupLeaderService } from './group-leader.service'
import { GroupLeaderGuard } from './guards/group-leader.guard'

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [GroupLeaderController],
  providers: [GroupLeaderService, GroupLeaderGuard],
})
export class GroupLeaderModule {}
