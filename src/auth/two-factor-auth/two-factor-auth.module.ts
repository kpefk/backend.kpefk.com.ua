import { Module } from '@nestjs/common'

import { MailService } from '@/libs/mail/mail.service'
import { UserService } from '@/user/user.service'

import { TwoFactorAuthService } from './two-factor-auth.service'

@Module({
  providers: [TwoFactorAuthService, MailService, UserService],
  exports: [TwoFactorAuthService]
})
export class TwoFactorAuthModule {}