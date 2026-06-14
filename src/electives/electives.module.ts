import { Module } from '@nestjs/common'

import { UserModule } from '@/user/user.module'

import { ElectiveSeasonsController } from './elective-seasons.controller'
import { ElectiveSeasonsService } from './elective-seasons.service'
import { ElectivesController } from './electives.controller'
import { ElectivesService } from './electives.service'

@Module({
  imports: [UserModule],
  controllers: [ElectivesController, ElectiveSeasonsController],
  providers: [ElectivesService, ElectiveSeasonsService],
  exports: [ElectivesService, ElectiveSeasonsService],
})
export class ElectivesModule {}
