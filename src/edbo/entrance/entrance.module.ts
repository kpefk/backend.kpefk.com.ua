import { Module } from '@nestjs/common'

import { EdboModule } from '../core/edbo.module'

import { EntranceController } from './entrance.controller'
import { EntranceService } from './entrance.service'

@Module({
	imports: [EdboModule],
	controllers: [EntranceController],
	providers: [EntranceService],
	exports: [EntranceService]
})
export class EntranceModule {}
