// Визначення констант для різних одиниць часу
const s = 1000
const m = s * 60
const h = m * 60
const d = h * 24
const w = d * 7
const y = d * 365.25

// Тип для різних одиниць часу
type Unit =
	| 'Years'
	| 'Year'
	| 'Yrs'
	| 'Yr'
	| 'Y'
	| 'Weeks'
	| 'Week'
	| 'W'
	| 'Days'
	| 'Day'
	| 'D'
	| 'Hours'
	| 'Hour'
	| 'Hrs'
	| 'Hr'
	| 'H'
	| 'Minutes'
	| 'Minute'
	| 'Mins'
	| 'Min'
	| 'M'
	| 'Seconds'
	| 'Second'
	| 'Secs'
	| 'Sec'
	| 's'
	| 'Milliseconds'
	| 'Millisecond'
	| 'Msecs'
	| 'Msec'
	| 'Ms'

// Тип для одиниць часу в будь-якому регістрі
type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>

// Тип для строкового значення, яке може містити число і необов'язкову одиницю часу
export type StringValue =
	| `${number}`
	| `${number}${UnitAnyCase}`
	| `${number} ${UnitAnyCase}`

/**
 * Перетворює строкове значення, що представляє час, в мілісекунди.
 *
 * @param str - Рядок, що представляє кількість часу, наприклад, "1 hour", "60s", "500 milliseconds".
 * @returns Кількість мілісекунд, що відповідає вказаному часу.
 * @throws {Error} Якщо рядок не відповідає очікуваному формату або якщо одиниця часу не розпізнана.
 *
 * @example
 * ms('1 minute'); // поверне 60000
 * ms('2 hours'); // поверне 7200000
 * ms('500 ms'); // поверне 500
 */
export function ms(str: StringValue): number {
	// Перевірка вхідних даних
	if (typeof str !== 'string' || str.length === 0 || str.length > 100) {
		throw new Error(
			'Значення, надане ms() має бути рядком довжиною від 1 до 99.'
		)
	}

	// Регулярний вираз для співставлення рядка з числом і необов'язковою одиницею часу
	const match =
		/^(?<value>-?(?:\d+)?\.?\d+) *(?<type>milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
			str
		)

	// Вилучення значення та типу з співпадіння
	const groups = match?.groups as { value: string; type?: string } | undefined
	if (!groups) {
		return NaN
	}
	const n = parseFloat(groups.value)
	const type = (groups.type || 'ms').toLowerCase() as Lowercase<Unit>

	// Перетворення строкового значення в мілісекунди в залежності від одиниці часу
	switch (type) {
		case 'years':
		case 'year':
		case 'yrs':
		case 'yr':
		case 'y':
			return n * y
		case 'weeks':
		case 'week':
		case 'w':
			return n * w
		case 'days':
		case 'day':
		case 'd':
			return n * d
		case 'hours':
		case 'hour':
		case 'hrs':
		case 'hr':
		case 'h':
			return n * h
		case 'minutes':
		case 'minute':
		case 'mins':
		case 'min':
		case 'm':
			return n * m
		case 'seconds':
		case 'second':
		case 'secs':
		case 'sec':
		case 's':
			return n * s
		case 'milliseconds':
		case 'millisecond':
		case 'msecs':
		case 'msec':
		case 'ms':
			return n
		default:
			throw new Error(
				`Помилка: одиниця часу ${type} була розпізнана, але не існує відповідного випадку. Будь ласка, перевірте введені дані.`
			)
	}
}
