import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common'
import type { Request, Response } from 'express'

/**
 * Глобальний фільтр винятків.
 *
 * Навіщо: дефолтний фільтр Nest коректно віддає HttpException і не світить
 * стек назовні, але для 500-х не лишає жодного діагностичного сліду — впав
 * запит у проді, а в логах порожньо. Цей фільтр додає саме логування:
 *
 * - `HttpException` (4xx/5xx від самого застосунку) — відповідь віддається
 *   БЕЗ змін, щоб не зламати контракт фронтенду (зокрема масив помилок
 *   валідації від ValidationPipe). 5xx логуються як error, 4xx — як debug,
 *   щоб не засмічувати лог очікуваними 401/403/404.
 * - Будь-що інше (нештатний виняток, помилка Prisma, TypeError) — повний
 *   стек у лог, клієнту — узагальнені 500 без внутрішніх деталей.
 */
/** HttpStatus — enum; порівнюємо з числовим статусом як з number. */
const SERVER_ERROR_FROM: number = HttpStatus.INTERNAL_SERVER_ERROR

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name)

	public catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest<Request>()

		const isHttpException = exception instanceof HttpException
		const status = isHttpException
			? exception.getStatus()
			: HttpStatus.INTERNAL_SERVER_ERROR

		const route = `${request.method} ${request.originalUrl}`

		if (isHttpException) {
			if (status >= SERVER_ERROR_FROM) {
				this.logger.error(`${route} → ${status}`, exception.stack)
			} else {
				this.logger.debug(`${route} → ${status}`)
			}
		} else {
			// Єдине місце, де нештатний виняток лишає слід: без цього
			// 500-ки в проді неможливо діагностувати.
			this.logger.error(
				`${route} → 500 Необроблений виняток`,
				exception instanceof Error ? exception.stack : String(exception)
			)
		}

		// Потокові роути (проксі фото/PDF з Google Drive) можуть впасти вже
		// після res.setHeader() — тоді писати тіло відповіді пізно, лишається
		// тільки розірвати з'єднання.
		if (response.headersSent) {
			response.destroy()
			return
		}

		if (isHttpException) {
			// Віддаємо тіло дефолтного Nest-формату як є.
			response.status(status).json(exception.getResponse())
			return
		}

		response.status(status).json({
			statusCode: status,
			message: 'Внутрішня помилка сервера',
			timestamp: new Date().toISOString(),
			path: request.originalUrl
		})
	}
}
