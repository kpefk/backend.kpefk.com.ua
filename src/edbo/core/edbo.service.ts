import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'

import { APP_ENV, APP_POLICY } from '@/config/environment'

// ── Типи відповідей ЄДЕБО ──────────────────────────────────────────

interface EdboTokenResponse {
	access_token: string
	token_type: string
	expires_in: number
}

export interface EdboErrorResponse {
	errorCode: number | null
	errorMessage: string
	errorDetails?: string
	paramsValidationErrors?: Array<{
		errorMessage: string
		propertyName: string
		jsonProperty: string
	}>
}

/**
 * Тип документа від ЄДЕБО API.
 * Використовується для пошуку та верифікації студентів під час реєстрації.
 */
export interface EdboPersonDocument {
	idPersonDocument: number
	idPersonDocumentType: number // 5 = РНОКПП, 16 = Студентський квиток, 36 = Паспорт, etc.
	personDocumentTypeName: string
	documentSeries: string | null
	documentNumbers: string
	documentDateGet: string | null
	documentIssued: string | null
	documentExpiredDate: string | null
	isCancelled: boolean
	isDeleted: boolean
	// ... (інші поля опущені)
	unzr: string | null // Унікальний номер запису
	rnokppUnzrValidity: string // "Валідний" або інші статуси
}

/**
 * Відповідь ЄДЕБО для списку документів фізичної особи.
 */
export interface EdboPersonDocumentsResponse {
	documents: EdboPersonDocument[]
	rowCount?: number
}

/**
 * Запис про навчання студента з `/api/studentEducations/list`.
 *
 * Канонічне місце для типу — core, бо саме тут живе HTTP-клієнт ЄДЕБО;
 * `edbo-sync` імпортує його звідси, щоб опис форми відповіді не двоївся.
 */
export interface EdboStudentRecord {
	educationId: number
	personId: number
	/// ЄДЕБО не завжди повертає код ЗВО у записі — тоді підставляємо EDEBO_CODE.
	universityId?: number
	personCodeU: string
	educationHistoryActualId: number
	dateBegin: string
	dateEnd: string
	historyTypeId: number
	personEducationHistoryTypeName: string
	personName: string
	personFIO: string
	birthday: string
	personNameEn: string
	personSexId: number
	personSexName: string
	isUkr: boolean
	licenseYear: number
	educationDateBegin: string
	educationDateEnd: string
	facultyName: string
	qualificationGroupId: number
	qualificationGroupName: string
	baseQualificationName: string
	educationFormId: number
	educationFormName: string
	isDualForm: boolean
	personEducationPaymentTypeName: string
	/// Live-API інколи віддає поле в PascalCase (doc-vs-live gotcha, як edrpo/universityType
	/// в university-sync) — тримаємо обидва варіанти й обираємо непорожній при мапінгу.
	PersonEducationPaymentTypeName?: string
	isLegalEntityPayment: boolean
	budgetYear: number
	isRegionGovernanceOrder: number
	isSecondHigher: boolean
	isShortTerm: boolean
	fullSpecialityName: string
	specializationName: string
	centralSpecializationId: number
	universityStudyProgramId: number
	studyProgramName: string
	studyProgramNameEn: string
	masterProgramTypeShortName: string
	eduProgramChooseDate: string
	professionInfo: string
	courseId: number
	courseName: string
	groupName: string
	isExistsGrantRequest: boolean
	privilegeCategory: string
	isDocEducationExists: boolean
	isDocStudTicketExists: boolean
	isDocAcademExists: boolean
	isDocAcademGeneratedExists: boolean
	academicMobilityList: string
	expelEducationTypeName: string
	academicLeaveTypeName: string
	universityIdFrom: number
	univNameFrom: string
	isWithoutPzso: boolean
	modifyDate: string
	enrollInfo: string
	orderOfEnrollmentId: number
	foreignEnrollInfo: string
	foreignOrderOfEnrollmentId: number
	orderStatusDiploma: string
	orderStatusTicket: string
	orderStatusSvid: string
	eduEndFIO: string
	alienId: number
	alienCount: number
	foreignTypeId: number
	foreignTypeName: string
	budgetTransferCategoryId: number
	budgetTransferCategoryName: string
	konkursValue: number
	sourceTypeName: string
	isForPhdRenewal: boolean
}

/**
 * Параметри для пошуку студента в ЄДЕБО.
 */
export interface EdboStudentSearchParams {
	universityId: number
	qualificationGroupId?: number // 9 = фаховий молодший бакалавр
	historyFilterId?: number // 1 = навчаються
	pageNo?: number
	pageSize?: number
}

// ── Сервіс ────────────────────────────────────────────────────────

/** HttpStatus — enum; `fetch` віддає status як number, тож порівнюємо як number. */
const UNAUTHORIZED_STATUS: number = HttpStatus.UNAUTHORIZED

@Injectable()
export class EdboService {
	private readonly logger = new Logger(EdboService.name)

	private readonly baseUrl = process.env.EDBO_BASE_URL!
	private readonly appKey = process.env.EDBO_APP_KEY!
	private readonly userLogin = process.env.EDBO_USER_LOGIN!
	private readonly userPassword = process.env.EDBO_USER_PASSWORD!

	// ── Кеш токена ──────────────────────────────────────────────────

	private cachedToken: string | null = null
	private tokenExpiresAt: number = 0
	/** In-flight запит токена — щоб паралельні виклики не авторизувались двічі. */
	private tokenPromise: Promise<string> | null = null

	// ── Авторизація ─────────────────────────────────────────────────

	/**
	 * Повертає Bearer-токен. Використовує кешований токен до закінчення
	 * його терміну дії (з буфером 60 секунд).
	 *
	 * Single-flight: якщо токен уже запитується, паралельні виклики чекають
	 * на той самий запит, а не роблять власний `POST /oauth/token` (ЄДЕБО
	 * відхиляє одночасні авторизації — duplicate session key).
	 */
	async getAccessToken(): Promise<string> {
		if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
			return this.cachedToken
		}

		// Уже йде авторизація — приєднуємось до неї.
		if (this.tokenPromise) {
			return this.tokenPromise
		}

		this.tokenPromise = this.fetchAndCacheToken().finally(() => {
			this.tokenPromise = null
		})
		return this.tokenPromise
	}

	private async fetchAndCacheToken(): Promise<string> {
		const tokenData = await this.fetchToken()
		// expires_in повертається в секундах; зберігаємо з буфером 60 с
		this.cachedToken = tokenData.access_token
		this.tokenExpiresAt = Date.now() + (tokenData.expires_in - 60) * 1000
		return this.cachedToken
	}

	private async fetchToken(): Promise<EdboTokenResponse> {
		const body = new URLSearchParams({
			grant_type: 'password',
			username: this.userLogin,
			password: this.userPassword,
			app_key: this.appKey
		}).toString()

		const response = await fetch(`${this.baseUrl}/oauth/token`, {
			method: 'POST',
			headers: {
				'Content-Type':
					'application/x-www-form-urlencoded; charset=utf-8'
			},
			body
		})

		// ✅ Читаємо як текст — не падає на HTML
		const text = await response.text()

		if (!response.ok) {
			// Лог лише при помилці; на успіху НЕ логуємо тіло (містить access_token).
			this.logger.error(
				`ЄДЕБО auth failed [${response.status}]:`,
				text.slice(0, 300)
			)
			throw new HttpException(
				'ЄДЕБО authentication failed',
				response.status
			)
		}

		return this.parseJson(text, '/oauth/token') as EdboTokenResponse
	}

	/**
	 * Примусово скидає кешований токен (наприклад після отримання 401).
	 */
	invalidateToken(): void {
		this.cachedToken = null
		this.tokenExpiresAt = 0
	}

	// ── Базовий HTTP-метод ──────────────────────────────────────────

	/**
	 * Виконує авторизований POST-запит до ЄДЕБО API.
	 * При отриманні 401 — інвалідує токен і повторює запит один раз.
	 *
	 * @param path - Шлях починаючи з `/api/`, наприклад `/api/studentEducations/add`
	 * @param body - Тіло запиту (буде серіалізовано в JSON)
	 */

	private static readonly DENIED_MESSAGE =
		'Authorization has been denied for this request.'

	/**
	 * Останні сегменти шляхів ЄДЕБО, що змінюють дані в реєстрі.
	 *
	 * Перелік закритий і звірений із повним набором ендпоінтів, які викликає
	 * застосунок: читання (`list`, `get`, `info`, `check`, `statusesHistory`,
	 * `out`, `documents`) сюди не потрапляє.
	 */
	private static readonly WRITE_SEGMENTS: ReadonlySet<string> = new Set([
		'add',
		'update',
		'del',
		'delete',
		'edit',
		'changestatus',
		'changeenrollpriority',
		'complexupdate',
		'motivationletterset',
		'editstatus'
	])

	/** Чи змінює цей виклик дані в ЄДЕБО. */
	public static isWriteOperation(path: string): boolean {
		const [withoutQuery] = path.split('?')
		const segments = (withoutQuery ?? '').split('/').filter(Boolean)
		const last = segments.at(-1)
		return (
			last !== undefined &&
			EdboService.WRITE_SEGMENTS.has(last.toLowerCase())
		)
	}

	/**
	 * Виконує запит до ЄДЕБО.
	 *
	 * Поза production write-операції блокуються тут — у єдиній точці, через яку
	 * проходять усі виклики реєстру. ЄДЕБО не має пісочниці: dev і staging
	 * ходять у ту саму бойову базу тими самими обліковими даними, тож єдиний
	 * надійний запобіжник — не випускати запит із процесу. Перемикача немає
	 * свідомо (див. `EnvironmentPolicy.allowEdboWrites`).
	 */
	async post<T>(path: string, body: unknown): Promise<T> {
		if (!APP_POLICY.allowEdboWrites && EdboService.isWriteOperation(path)) {
			this.logger.warn(
				`Заблоковано write-операцію ЄДЕБО ${path}: тір «${APP_ENV}» не має права ` +
					'змінювати дані державного реєстру.'
			)
			throw new HttpException(
				`Операція «${path}» змінює дані в ЄДЕБО і заборонена в тірі «${APP_ENV}». ` +
					'Записи в реєстр виконуються лише з production.',
				HttpStatus.FORBIDDEN
			)
		}
		return this.doPost<T>(path, body, false)
	}

	private async doPost<T>(
		path: string,
		body: unknown,
		isRetry: boolean
	): Promise<T> {
		const token = await this.getAccessToken()

		const response = await fetch(`${this.baseUrl}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(body)
		})

		// ✅ Спочатку читаємо як текст — не падає на HTML
		const text = await response.text()

		// Тимчасовий лог для діагностики — прибери після вирішення проблеми
		if (!response.ok || text.trimStart().startsWith('<')) {
			this.logger.warn(
				`ЄДЕБО raw response [${response.status}] ${path}: ${text.slice(0, 300)}`
			)
		}

		// ✅ Обробляємо порожню відповідь (204 No Content)
		const data: unknown =
			text.length > 0 ? this.parseJson(text, path) : null

		// ── Розпізнавання протухлого токена ─────────────────────────────
		const isTokenExpired =
			response.status === UNAUTHORIZED_STATUS ||
			(data as { message?: string } | null)?.message ===
				EdboService.DENIED_MESSAGE

		if (isTokenExpired && !isRetry) {
			this.logger.warn('ЄДЕБО токен протух — оновлення і повтор запиту')
			this.invalidateToken()
			return this.doPost<T>(path, body, true)
		}

		if (!response.ok) {
			const errorBody = data as EdboErrorResponse
			this.logger.error(
				`ЄДЕБО API error ${response.status} on ${path}`,
				JSON.stringify(errorBody)
			)
			throw new HttpException(errorBody, response.status)
		}

		return data as T
	}

	/**
	 * Безпечний JSON.parse з інформативною помилкою.
	 */
	private parseJson(text: string, path: string): unknown {
		try {
			return JSON.parse(text)
		} catch {
			this.logger.error(
				`ЄДЕБО повернув не-JSON для ${path}: ${text.slice(0, 200)}`
			)
			throw new HttpException(
				`ЄДЕБО API повернув невалідний JSON для ${path}`,
				HttpStatus.BAD_GATEWAY
			)
		}
	}

	// ── Публічні методи для пошуку студента ──────────────────────────

	/**
	 * Шукає студентів в ЄДЕБО за документами.
	 * Це потрібно для верифікації студента під час реєстрації.
	 *
	 * @param params - Параметри пошуку (universityId, qualificationGroupId, historyFilterId)
	 * @returns Масив студентів, що відповідають критеріям
	 */
	async searchStudents(
		params: EdboStudentSearchParams
	): Promise<EdboStudentRecord[]> {
		return this.post<EdboStudentRecord[]>('/api/studentEducations/list', {
			universityId: params.universityId,
			qualificationGroupId: params.qualificationGroupId ?? 9, // 9 = фаховий молодший бакалавр
			historyFilterId: params.historyFilterId ?? 1, // 1 = навчаються
			pageNo: params.pageNo ?? 0,
			pageSize: params.pageSize ?? 50
		})
	}

	/**
	 * Отримує документи фізичної особи за UUID кодом (personCodeU).
	 * Використовується для синхронізації документів студента.
	 *
	 * @param personCodeU - UUID код особи (наприклад з personCodeU повернутого от API)
	 * @returns Масив документів особи
	 */
	async getPersonDocumentsSync(
		personCodeU: string
	): Promise<EdboPersonDocument[]> {
		try {
			const response = await this.post<EdboPersonDocument[]>(
				'/api/physPersons/documents',
				{ personCode: personCodeU }
			)
			return Array.isArray(response) ? response : []
		} catch (error) {
			this.logger.error(
				`Failed to get documents for person ${personCodeU}:`,
				error
			)
			return []
		}
	}

	/**
	 * Пошук студента в ЄДЕБО за РНОКПП (ІПН).
	 * Повертає документи та інформацію про студента.
	 *
	 * @param rnokpp - РНОКПП студента (10 цифр)
	 * @param universityId - Код закладу в ЄДЕБО
	 * @returns Дані про студента з документами
	 */
	async findStudentByRnokpp(rnokpp: string, universityId: number) {
		// Спочатку шукаємо в списку студентів
		const students = await this.searchStudents({ universityId })

		// Потім перевіряємо документи кожного студента
		for (const student of students) {
			try {
				const docs = await this.getPersonDocumentsSync(
					student.personCodeU
				)
				const hasRnokpp = docs.some(
					(doc: EdboPersonDocument) =>
						doc.idPersonDocumentType === 5 && // 5 = РНОКПП
						doc.documentNumbers === rnokpp
				)

				if (hasRnokpp) {
					return { student, documents: docs }
				}
			} catch (error) {
				this.logger.warn(
					`Failed to get documents for student ${student.personId}:`,
					error
				)
				continue
			}
		}

		return null
	}

	/**
	 * Пошук студента в ЄДЕБО за студентським квитком.
	 * Повертає документи та інформацію про студента.
	 *
	 * @param series - Серія студентського квитка (наприклад "СТ" або "BC")
	 * @param number - Номер студентського квитка
	 * @param universityId - Код закладу в ЄДЕБО
	 * @returns Дані про студента з документами
	 */
	async findStudentByTicket(
		series: string,
		number: string,
		universityId: number
	) {
		const students = await this.searchStudents({ universityId })

		for (const student of students) {
			try {
				const docs = await this.getPersonDocumentsSync(
					student.personCodeU
				)
				const hasTicket = docs.some(
					(doc: EdboPersonDocument) =>
						doc.idPersonDocumentType === 16 && // 16 = Студентський квиток
						doc.documentSeries === series &&
						doc.documentNumbers === number
				)

				if (hasTicket) {
					return { student, documents: docs }
				}
			} catch (error) {
				this.logger.warn(
					`Failed to get documents for student ${student.personId}:`,
					error
				)
				continue
			}
		}

		return null
	}

	/**
	 * Пошук студента в ЄДЕБО за паспортом.
	 * Повертає документи та інформацію про студента.
	 *
	 * @param series - Серія паспорта
	 * @param number - Номер паспорта
	 * @param universityId - Код закладу в ЄДЕБО
	 * @returns Дані про студента з документами
	 */
	async findStudentByPassport(
		series: string,
		number: string,
		universityId: number
	) {
		const students = await this.searchStudents({ universityId })

		for (const student of students) {
			try {
				const docs = await this.getPersonDocumentsSync(
					student.personCodeU
				)
				const hasPassport = docs.some(
					(doc: EdboPersonDocument) =>
						doc.idPersonDocumentType === 36 && // 36 = Паспорт громадянина України
						doc.documentSeries === series &&
						doc.documentNumbers === number
				)

				if (hasPassport) {
					return { student, documents: docs }
				}
			} catch (error) {
				this.logger.warn(
					`Failed to get documents for student ${student.personId}:`,
					error
				)
				continue
			}
		}

		return null
	}
}
