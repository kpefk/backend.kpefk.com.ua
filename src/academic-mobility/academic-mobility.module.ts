import { Module } from '@nestjs/common'

import { GradesModule } from '@/grades/grades.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { AcademicMobilityController } from './academic-mobility.controller'
import { AcademicMobilityService } from './academic-mobility.service'

// UserModule — щоб AuthGuard (@Authorization) міг інжектити UserService.
@Module({
	imports: [PrismaModule, UserModule, GradesModule],
	controllers: [AcademicMobilityController],
	providers: [AcademicMobilityService]
})
export class AcademicMobilityModule {}
