import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha'

import { getRecaptchaConfig } from '@/config/recaptcha.config'
import { MailService } from '@/libs/mail/mail.service'
import { UserService } from '@/user/user.service'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PasswordRecoveryModule } from './password-recovery/password-recovery.module'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'

@Module({
  imports: [
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getRecaptchaConfig,
      inject: [ConfigService]
    }),
    PasswordRecoveryModule
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, MailService, TwoFactorAuthService],
  exports: [AuthService]
})
export class AuthModule {}