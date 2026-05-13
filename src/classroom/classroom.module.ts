import { Module } from '@nestjs/common'

import { GoogleDriveModule } from '@/libs/google-drive/google-drive.module'
import { UserModule } from '@/user/user.module'

import { ClassroomController } from './classroom.controller'
import { ClassroomService } from './classroom.service'

@Module({
  imports: [GoogleDriveModule, UserModule],
  controllers: [ClassroomController],
  providers: [ClassroomService],
  exports: [ClassroomService]
})
export class ClassroomModule {}