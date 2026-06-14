import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common'
import { NestFactory, Reflector } from '@nestjs/core'
import { DecimalSerializerInterceptor } from './libs/common/interceptors/decimal-serializer.interceptor'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { RedisStore } from 'connect-redis'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { createClient } from 'redis'

import { AppModule } from './app.module'
import { IS_DEV_ENV } from './libs/common/utils/is-dev.util'
import { ms, StringValue } from './libs/common/utils/ms.util'
import { parseBoolean } from './libs/common/utils/parse-boolean.util'

/**
 * Runs the NestJS application.
 *
 * The function initializes the application, configures middleware,
 * configures session management and starts the server.
 *
 * @async
 * @function bootstrap
 * @returns {Promise<void>} A promise that resolves when the application is started.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)

  const redis = createClient({
    password: configService.getOrThrow<string>('redis.password'),
    socket: {
      host: configService.getOrThrow<string>('redis.host'),
      port: configService.getOrThrow<number>('redis.port')
    }
  })

  // Логуємо runtime-помилки зʼєднання, щоб клієнт redis не кидав unhandled error.
  redis.on('error', (err) => console.error('[Redis] connection error:', err.message))

  // Fail-fast: без робочого Redis session-store не працює, і запити, що зберігають
  // сесію (логін, OAuth-callback), зависають назавжди. Краще впасти на старті.
  await redis.connect()

  app.use(cookieParser(configService.getOrThrow<string>('COOKIES_SECRET')))

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // Видаляє з тіла запиту поля, яких немає в DTO — захист від mass-assignment.
      whitelist: true
    })
  )

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new DecimalSerializerInterceptor(),
  )

  // Swagger documentation — exposed only in development to avoid leaking the
  // full API surface in production.
  if (IS_DEV_ENV) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MyKPEFK Backend')
      .setDescription('API documentation for MyKPEFK system')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header'
        },
        'access-token'
      )
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true
      }
    })
  }

  app.use(
    session({
      secret: configService.getOrThrow<string>('SESSION_SECRET'),
      name: configService.getOrThrow<string>('SESSION_NAME'),
      resave: true,
      saveUninitialized: false,
      cookie: {
        domain: configService.getOrThrow<string>('SESSION_DOMAIN'),
        maxAge: ms(configService.getOrThrow<StringValue>('SESSION_MAX_AGE')),
        httpOnly: parseBoolean(
          configService.getOrThrow<string>('SESSION_HTTP_ONLY')
        ),
        secure: parseBoolean(
          configService.getOrThrow<string>('SESSION_SECURE')
        ),
        sameSite: 'lax'
      },
      store: new RedisStore({
        client: redis,
        prefix: configService.getOrThrow<string>('SESSION_FOLDER')
      })
    })
  )

  app.enableCors({
    origin: configService.getOrThrow<string>('ALLOWED_ORIGIN'),
    credentials: true,
    exposedHeaders: ['set-cookie']
  })

  await app.listen(configService.getOrThrow<number>('APPLICATION_PORT'))
}

bootstrap().catch((error) => {
  console.error('Application failed to start', error)
  process.exit(1)
})