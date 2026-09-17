import { Request } from 'express'

/** express-session віддає помилку як `any`; нормалізуємо до Error для reject. */
function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error))
}

export function regenerateSession(req: Request, userId: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		req.session.regenerate(error => {
			if (error) {
				reject(toError(error))
				return
			}

			req.session.userId = userId
			req.session.save(saveError => {
				if (saveError) {
					reject(toError(saveError))
					return
				}

				resolve()
			})
		})
	})
}
