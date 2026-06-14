import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AuthModule } from './auth/auth.module'
import { PasswordRecoveryModule } from './auth/password-recovery/password-recovery.module'
import { ProviderModule } from './auth/provider/provider.module'
import { GoogleProvider } from './auth/provider/services/google.provider'
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
import { StudentModule } from './student/student.module';
import { StaffModule } from './staff/staff.module';
import { EdboSyncModule } from './edbo/sync/edbo-sync.module'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { GroupsModule } from './groups/groups.module'
import { CurriculumModule } from './curriculum/curriculum.module'
import { ElectivesModule } from './electives/electives.module'
import { GroupLeaderModule } from './group-leader/group-leader.module'

@Module({
	imports: [
		ScheduleModule.forRoot(),
		// Базовий ліміт запитів. Жорсткіші ліміти — точково на auth-ендпоінтах
		// через @Throttle() + @UseGuards(ThrottlerGuard).
		ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
		ConfigModule.forRoot({
			ignoreEnvFile: !IS_DEV_ENV,
			isGlobal: true,
			load: [redisConfig],
		}),
		PrismaModule,
		AuthModule,
		UserModule,
		ProviderModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (config: ConfigService) => ({
				baseUrl: config.getOrThrow<string>('APPLICATION_URL'),
				services: [
					new GoogleProvider({
						client_id: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
						client_secret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
						scopes: ['email', 'profile'],
					}),
				],
			}),
			inject: [ConfigService],
		}),
		MailModule,
		PasswordRecoveryModule,
		TwoFactorAuthModule,
		AdminModule,
		ClassroomModule,
		GoogleDriveModule,
		EdboModule,
		EdboSyncModule,
		EntranceModule,
		StudentModule,
		StaffModule,
		GroupsModule,
		CurriculumModule,
		ElectivesModule,
		GroupLeaderModule,
	]
})
export class AppModule {}
