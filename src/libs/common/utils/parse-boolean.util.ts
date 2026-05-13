/**
 * Перетворює строкове значення в логічне значення (boolean).
 *
 * Ця функція приймає рядок, що представляє логічне значення,
 * і повертає відповідне логічне значення. Якщо рядок дорівнює
 * "true" (ігноруючи регістр), функція поверне `true`. Якщо рядок дорівнює
 * "false", функція поверне `false`. Якщо передано значення іншого типу
 * або рядок не відповідає очікуваним значенням, буде викинуто
 * виключення.
 *
 * @param value - Рядок, що представляє логічне значення ("true" або "false").
 * @returns {boolean} Логічне значення, що відповідає переданому рядку.
 * @throws {Error} Якщо передане значення не може бути перетворено в логічне значення.
 *
 * @example
 * parseBoolean('true');  // поверне true
 * parseBoolean('false'); // поверне false
 * parseBoolean('TRUE');  // поверне true
 * parseBoolean('False'); // поверне false
 */
export function parseBoolean(value: string): boolean {
	if (typeof value === 'boolean') {
		return value
	}

	if (typeof value === 'string') {
		const lowerValue = value.trim().toLowerCase()
		if (lowerValue === 'true') {
			return true
		}
		if (lowerValue === 'false') {
			return false
		}
	}

	throw new Error(
		`Не вдалося перетворити значення "${value}" в логічне значення.`
	)
}
