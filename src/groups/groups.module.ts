import { Module } from '@nestjs/common'

import { UserModule } from '@/user/user.module'

import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'
import { StudentGroupHistoryService } from './student-group-history.service'

@Module({
  imports: [UserModule],
  controllers: [GroupsController],
  providers: [GroupsService, StudentGroupHistoryService],
  exports: [GroupsService, StudentGroupHistoryService],
})
export class GroupsModule {}
