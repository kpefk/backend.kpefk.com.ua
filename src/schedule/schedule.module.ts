import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { ScheduleController } from './schedule.controller'
import { ScheduleAuditService } from './schedule-audit.service'
import { ScheduleExportService } from './schedule-export.service'
import { ScheduleGeneratorService } from './schedule-generator.service'
import { ScheduleService } from './schedule.service'
import { ScheduleSettingsService } from './schedule-settings.service'
import { ScheduleSubstitutionService } from './schedule-substitution.service'

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    ScheduleGeneratorService,
    ScheduleSettingsService,
    ScheduleSubstitutionService,
    ScheduleExportService,
    ScheduleAuditService,
  ],
  exports: [ScheduleService],
})
export class ScheduleModule {}
