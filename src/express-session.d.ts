import 'express-session'

declare module 'express-session' {
	/**
	 * Розширює стандартний інтерфейс SessionData, додаючи властивість userId.
	 * Властивість userId буде доступна в об'єкті сесії.
	 */
	interface SessionData {
		userId?: string
	}
}