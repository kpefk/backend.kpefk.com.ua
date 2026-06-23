import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { AttendanceController } from './attendance.controller'
import { AttendanceScheduleService } from './attendance-schedule.service'
import { AttendanceService } from './attendance.service'

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceScheduleService],
})
export class AttendanceModule {}
