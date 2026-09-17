import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { envSchema } from '@/config/env.validation'
import redisConfig from '@/config/redis.config'

import { AcademicMobilityModule } from './academic-mobility/academic-mobility.module'
import { AdminModule } from './admin/admin.module'
import { AdmissionsModule } from './admissions/admissions.module'
import { AttendanceModule } from './attendance/attendance.module'
import { AuthModule } from './auth/auth.module'
import { AuthGuard } from './auth/guards/auth.guard'
import { PasswordRecoveryModule } from './auth/password-recovery/password-recovery.module'
import { ProviderModule } from './auth/provider/provider.module'
import { GoogleProvider } from './auth/provider/services/google.provider'
import { TwoFactorAuthModule } from './auth/two-factor-auth/two-factor-auth.module'
import { ClassroomModule } from './classroom/classroom.module'
import { CreditRecognitionModule } from './credit-recognition/credit-recognition.module'
import { CurriculumModule } from './curriculum/curriculum.module'
import { DiplomaModule } from './diploma/diploma.module'
import { EdboModule } from './edbo/core/edbo.module'
import { EntranceModule } from './edbo/entrance/entrance.module'
import { EdboSyncModule } from './edbo/sync/edbo-sync.module'
import { ElectivesModule } from './electives/electives.module'
import { GradesModule } from './grades/grades.module'
import { GroupLeaderModule } from './group-leader/group-leader.module'
import { GroupsModule } from './groups/groups.module'
import { HealthModule } from './health/health.module'
import { IS_DEV_ENV } from './libs/common/utils/is-dev.util'
import { GoogleDriveModule } from './libs/google-drive/google-drive.module'
import { MailModule } from './libs/mail/mail.module'
import { PrismaModule } from './prisma/prisma.module'
import { RatingModule } from './rating/rating.module'
import { ScheduleModule as ScheduleFeatureModule } from './schedule/schedule.module'
import { StaffModule } from './staff/staff.module'
import { StudentModule } from './student/student.module'
import { SubgroupsModule } from './subgroups/subgroups.module'
import { SurveysModule } from './surveys/surveys.module'
import { UserModule } from './user/user.module'

@Module({
	imports: [
		ScheduleModule.forRoot(),
		// Базовий ліміт запитів для ВСІХ роутів — застосовується глобально
		// через APP_GUARD нижче. Жорсткіші/м'якші ліміти — точково через
		// @Throttle() на конкретних роутах (логін, відновлення паролю,
		// ЄДЕБО-синхронізація, завантаження файлів, /health).
		ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
		ConfigModule.forRoot({
			ignoreEnvFile: !IS_DEV_ENV,
			isGlobal: true,
			load: [redisConfig],
			// Nest 12 приймає будь-яку Standard Schema — Zod підходить напряму.
			// Без цього відсутня змінна падала лише в мить першого getOrThrow(),
			// тобто вже під продакшн-трафіком, а не на старті.
			validationSchema: envSchema
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
						client_id:
							config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
						client_secret: config.getOrThrow<string>(
							'GOOGLE_CLIENT_SECRET'
						),
						scopes: ['email', 'profile']
					})
				]
			}),
			inject: [ConfigService]
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
		ScheduleFeatureModule,
		DiplomaModule,
		SubgroupsModule,
		AttendanceModule,
		GradesModule,
		SurveysModule,
		RatingModule,
		CreditRecognitionModule,
		AcademicMobilityModule,
		AdmissionsModule,
		HealthModule
	],
	providers: [
		// Rate limiting за замовчуванням. ThrottlerModule.forRoot описував
		// «базовий ліміт», але без APP_GUARD він не діяв: реально лімітувались
		// лише 8 роутів із 326, де стояв явний @UseGuards(ThrottlerGuard).
		// Guard має йти ПЕРЕД AuthGuard, щоб відсікати флуд ще до походу в БД
		// за користувачем.
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard
		},
		// Автентифікація за замовчуванням (fail closed): кожен роут вимагає
		// сесію, якщо явно не позначений @Public(). Раніше захист вмикався
		// лише там, де хтось не забув поставити @Authorization() — саме так
		// EntranceController опинився повністю відкритим.
		// Перевірку ролі це не замінює: @Authorization(role) далі додає
		// RolesGuard на конкретних контролерах.
		{
			provide: APP_GUARD,
			useClass: AuthGuard
		}
	]
})
export class AppModule {}
