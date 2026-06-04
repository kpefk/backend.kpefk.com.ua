import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { PrismaModule } from '@/prisma/prisma.module'
import { EdboModule } from '@/edbo/core/edbo.module'
import { GroupsModule } from '@/groups/groups.module'
import { UserModule } from '@/user/user.module'

import { EdboSyncController } from './edbo-sync.controller'
import { EdboSyncService } from './edbo-sync.service'
import { SyncStateService } from './sync-state.service'

@Module({
  imports: [
    PrismaModule,
    EdboModule,
    UserModule,
    GroupsModule,
  ],
  controllers: [EdboSyncController],
  providers: [EdboSyncService, SyncStateService],
  exports: [EdboSyncService],
})
export class EdboSyncModule {}
