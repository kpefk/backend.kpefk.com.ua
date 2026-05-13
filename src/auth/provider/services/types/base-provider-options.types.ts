import { TypeProviderOptions } from "./provider-options.types"

/**
 * Опції базового провайдера OAuth.
 *
 * Цей тип описує необхідні параметри для аутентифікації через OAuth.
 */
export type TypeBaseProviderOptions = TypeProviderOptions & {
	name: string
	authorize_url: string
	access_url: string
	profile_url: string
}
