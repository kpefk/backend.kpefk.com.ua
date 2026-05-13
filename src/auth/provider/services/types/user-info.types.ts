/**
 * Інформація про користувача, отримана від OAuth-провайдера.
 *
 * Цей тип описує структуру даних, що містить інформацію про користувача,
 * включаючи токени доступу та інформацію про провайдера.
 */
export type TypeUserInfo = {
	id: string
	picture: string
	name: string
	email: string
	access_token?: string
	refresh_token?: string
	expires_at?: number
	provider: string
}
