import { Module } from '@nestjs/common'

import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
	controllers: [AdminController],
	providers: [AdminService, UserService, MailService, PrismaService]
})
export class AdminModule { }