import { Module } from '@nestjs/common'

import { UserModule } from '@/user/user.module'

import { QualificationUpgradesController } from './qualification-upgrades.controller'
import { QualificationUpgradesService } from './qualification-upgrades.service'
import { StaffController } from './staff.controller'
import { StaffService } from './staff.service'

// UserModule is imported so that AuthGuard (used by @Authorization())
// can resolve its UserService dependency within this module context.
// PrismaService is @Global() — no import needed.
@Module({
  imports: [UserModule],
  controllers: [StaffController, QualificationUpgradesController],
  providers: [StaffService, QualificationUpgradesService],
  exports: [StaffService, QualificationUpgradesService],
})
export class StaffModule {}
