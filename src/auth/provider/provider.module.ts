import { DynamicModule, Module } from '@nestjs/common'

import { UserModule } from '@/user/user.module'

import {
	ProviderOptionsSymbol,
	TypeAsyncOptions,
	TypeOptions
} from './provider.constants'
import { OAuthController } from './oauth.controller'
import { ProviderService } from './provider.service'

/**
 * Module for managing OAuth providers.
 */
@Module({})
export class ProviderModule {
	public static register(options: TypeOptions): DynamicModule {
		return {
			module: ProviderModule,
			imports: [UserModule],
			controllers: [OAuthController],
			providers: [
				{ useValue: options, provide: ProviderOptionsSymbol },
				ProviderService,
			],
			exports: [ProviderService],
		}
	}

	public static registerAsync(options: TypeAsyncOptions): DynamicModule {
		return {
			module: ProviderModule,
			imports: [...(options.imports ?? []), UserModule],
			controllers: [OAuthController],
			providers: [
				{
					useFactory: options.useFactory,
					provide: ProviderOptionsSymbol,
					inject: options.inject,
				},
				ProviderService,
			],
			exports: [ProviderService],
		}
	}
}
