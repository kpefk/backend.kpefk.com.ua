import { Module } from '@nestjs/common'

import { GradesModule } from '@/grades/grades.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { CreditRecognitionController } from './credit-recognition.controller'
import { CreditRecognitionService } from './credit-recognition.service'

// UserModule — щоб AuthGuard (@Authorization) міг інжектити UserService.
@Module({
	imports: [PrismaModule, UserModule, GradesModule],
	controllers: [CreditRecognitionController],
	providers: [CreditRecognitionService]
})
export class CreditRecognitionModule {}
