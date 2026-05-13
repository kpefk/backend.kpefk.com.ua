import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AuthModule } from './auth/auth.module'
import { PasswordRecoveryModule } from './auth/password-recovery/password-recovery.module'
import { ProviderModule } from './auth/provider/provider.module'
import { TwoFactorAuthModule } from './auth/two-factor-auth/two-factor-auth.module'
import { IS_DEV_ENV } from './libs/common/utils/is-dev.util'
import { MailModule } from './libs/mail/mail.module'
import { PrismaModule } from './prisma/prisma.module'
import { UserModule } from './user/user.module'
import { AdminModule } from './admin/admin.module'
import { ClassroomModule } from './classroom/classroom.module'
import { GoogleDriveModule } from './libs/google-drive/google-drive.module'
import { EdboModule } from './edbo/core/edbo.module';
import redisConfig from '../redis.config'
import { EntranceModule } from './edbo/entrance/entrance.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			ignoreEnvFile: !IS_DEV_ENV,
			isGlobal: true,
			load: [redisConfig],
		}),
		PrismaModule,
		AuthModule,
		UserModule,
		ProviderModule,
		MailModule,
		PasswordRecoveryModule,
		TwoFactorAuthModule,
		AdminModule,
		ClassroomModule,
		GoogleDriveModule,
		EdboModule,
		EntranceModule
	]
})
export class AppModule {}
