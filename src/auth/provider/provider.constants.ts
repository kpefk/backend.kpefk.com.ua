import { FactoryProvider, ModuleMetadata } from '@nestjs/common'
import { BaseOAuthService } from './services/base-oauth.service'

/**
 * Символ для ідентифікації опцій провайдера.
 */
export const ProviderOptionsSymbol = Symbol('ProviderOptions')

/**
 * Тип для опцій провайдера.
 *
 * Цей тип описує базовий URL та масив сервісів OAuth.
 */
export type TypeOptions = {
	baseUrl: string
	services: ReadonlyArray<BaseOAuthService>
}

/**
 * Тип для асинхронних опцій провайдера.
 *
 * Цей тип описує асинхронні опції, що містять імпорти та фабричні функції.
 */
export type TypeAsyncOptions = Pick<ModuleMetadata, 'imports'> &
	Pick<FactoryProvider<TypeOptions>, 'useFactory' | 'inject'>