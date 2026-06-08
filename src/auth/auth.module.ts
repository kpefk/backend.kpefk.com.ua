import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha'

import { getRecaptchaConfig } from '@/config/recaptcha.config'
import { MailService } from '@/libs/mail/mail.service'
import { UserService } from '@/user/user.service'
import { EdboModule } from '@/edbo/core/edbo.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PasswordRecoveryModule } from './password-recovery/password-recovery.module'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'
import { TotpService } from './two-factor-auth/totp.service'
import { TwoFactorController } from './two-factor-auth/two-factor.controller'

@Module({
  imports: [
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getRecaptchaConfig,
      inject: [ConfigService]
    }),
    PasswordRecoveryModule,
    EdboModule
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [AuthService, UserService, MailService, TwoFactorAuthService, TotpService],
  exports: [AuthService]
})
export class AuthModule {}