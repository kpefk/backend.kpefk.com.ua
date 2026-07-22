import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { AttendanceScheduleService } from './attendance-schedule.service'
import { AttendanceSummaryService } from './attendance-summary.service'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { JournalService } from './journal.service'

@Module({
	imports: [PrismaModule, UserModule],
	controllers: [AttendanceController],
	providers: [
		AttendanceService,
		AttendanceScheduleService,
		AttendanceSummaryService,
		JournalService
	],
	exports: [AttendanceSummaryService]
})
export class AttendanceModule {}
