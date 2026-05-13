import { DynamicModule, Module } from '@nestjs/common'

import {
	ProviderOptionsSymbol,
	TypeAsyncOptions,
	TypeOptions
} from './provider.constants'
import { ProviderService } from './provider.service'

/**
 * Модуль для управління провайдерами OAuth.
 */
@Module({})
export class ProviderModule {
	/**
	 * Регистрація модуля провайдерів з синхронними опціями.
	 *
	 * @param options - Опції провайдера, що містять базовий URL та сервіси.
	 * @returns Динамічний модуль провайдерів.
	 */
	public static register(options: TypeOptions): DynamicModule {
		return {
			module: ProviderModule,
			providers: [
				{
					useValue: options,
					provide: ProviderOptionsSymbol
				},
				ProviderService
			],
			exports: [ProviderService]
		}
	}

	/**
	 * Регистрація модуля провайдерів з асинхронними опціями.
	 *
	 * @param options - Асинхронні опції провайдера, що містять імпорти та фабричні функції.
	 * @returns Динамічний модуль провайдерів.
	 */
	public static registerAsync(options: TypeAsyncOptions): DynamicModule {
		return {
			module: ProviderModule,
			imports: options.imports,
			providers: [
				{
					useFactory: options.useFactory,
					provide: ProviderOptionsSymbol,
					inject: options.inject
				},
				ProviderService
			],
			exports: [ProviderService]
		}
	}
}
