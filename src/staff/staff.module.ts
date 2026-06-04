import { Module } from '@nestjs/common'

import { UserModule } from '@/user/user.module'

import { StaffController } from './staff.controller'
import { StaffService } from './staff.service'

// UserModule is imported so that AuthGuard (used by @Authorization())
// can resolve its UserService dependency within this module context.
// PrismaService is @Global() — no import needed.
@Module({
  imports: [UserModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
