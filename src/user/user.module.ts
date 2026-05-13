import { Module } from '@nestjs/common'

import { MailService } from '@/libs/mail/mail.service'

import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
	controllers: [UserController],
	providers: [UserService, MailService],
	exports: [UserService]
})
export class UserModule { }