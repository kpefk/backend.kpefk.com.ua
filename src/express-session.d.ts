import 'express-session'

declare module 'express-session' {
	/**
	 * Extends the standard SessionData interface by adding the userId property.
	 * The userId property will be available in the session object.
	 */
	interface SessionData {
		userId?: string
	}
}
