import { Module } from '@nestjs/common'

import { EdboModule } from '@/edbo/core/edbo.module'
import { EntranceModule } from '@/edbo/entrance/entrance.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { AdmissionSyncService } from './admission-sync.service'
import { AdmissionsController } from './admissions.controller'
import { AdmissionsService } from './admissions.service'

// UserModule — щоб AuthGuard (@Authorization) міг інжектити UserService.
// EntranceModule — specialitiesList (КП); EdboModule — прямий edbo.post для заяв.
@Module({
	imports: [PrismaModule, UserModule, EntranceModule, EdboModule],
	controllers: [AdmissionsController],
	providers: [AdmissionsService, AdmissionSyncService]
})
export class AdmissionsModule {}
