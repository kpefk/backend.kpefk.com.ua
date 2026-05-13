/**
 * Опції провайдера OAuth.
 *
 * Цей тип описує параметри, необхідні для налаштування провайдера OAuth.
 */
export type TypeProviderOptions = {
	scopes: ReadonlyArray<string>
	client_id: string
	client_secret: string
}
