import { Module } from '@nestjs/common'

import { GoogleWorkspaceModule } from '@/libs/google-workspace/google-workspace.module'
import { UserModule } from '@/user/user.module'

import { StudentController } from './student.controller'
import { StudentService } from './student.service'

@Module({
  imports: [UserModule, GoogleWorkspaceModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
