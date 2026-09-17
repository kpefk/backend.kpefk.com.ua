import { Module } from '@nestjs/common'

import { UserModule } from '@/user/user.module'

import { EdboModule } from '../core/edbo.module'

import { EntranceController } from './entrance.controller'
import { EntranceService } from './entrance.service'

@Module({
	// UserModule потрібен, щоб AuthGuard на контролері зміг резолвити UserService
	// (той самий набір імпортів, що і в EdboSyncModule).
	imports: [EdboModule, UserModule],
	controllers: [EntranceController],
	providers: [EntranceService],
	exports: [EntranceService]
})
export class EntranceModule {}
