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

  await redis.connect().catch(console.error)

  app.use(cookieParser(configService.getOrThrow<string>('COOKIES_SECRET')))

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true
    })
  )

  // Global serialization:
  //   1. ClassSerializerInterceptor — @Exclude / @Expose on entity classes.
  //   2. DecimalSerializerInterceptor — converts Prisma Decimal instances to
  //      "X.XX" strings before ClassSerializerInterceptor's instanceToPlain
  //      can turn them into internal {d,e,s} objects.
  //
  // NestJS outgoing-response order: last registered → runs first.
  // DecimalSerializer is registered last, so it fires first on the response,
  // giving ClassSerializer only plain JS values to process.
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new DecimalSerializerInterceptor(),
  )

  // Swagger documentation
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

  // Documentation available at /docs
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true // Saves token between page reloads
    }
  })

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

bootstrap()