import { Module } from '@nestjs/common'

import { AttendanceModule } from '@/attendance/attendance.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { GradeScaleService } from './grade-scale.service'
import { GradeWeightSettingsService } from './grade-weight-settings.service'
import { GradesController } from './grades.controller'
import { GradesService } from './grades.service'
import { VidomistService } from './vidomist.service'

@Module({
	imports: [PrismaModule, UserModule, AttendanceModule],
	controllers: [GradesController],
	providers: [
		GradesService,
		GradeScaleService,
		VidomistService,
		GradeWeightSettingsService
	],
	exports: [GradeScaleService, GradesService]
})
export class GradesModule {}
