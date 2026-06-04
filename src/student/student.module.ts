import { Module } from '@nestjs/common'

import { UserModule } from '@/user/user.module'

import { StudentController } from './student.controller'
import { StudentService } from './student.service'

@Module({
  imports: [UserModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
