import type { GradeScale } from '@prisma/client'

/**
 * Нормалізує семестрову оцінку до 100-бальної шкали.
 * Формула — зі зразка коледжу (268.xlsx, аркуш «рейтинг»):
 *   12-бальна: g / 12 × 100
 *   5-бальна:  спершу переводиться в 12-бальну як (g + (g−2)×2) = 3g−4
 *              (3→5, 4→8, 5→11), потім / 12 × 100.
 */
export function normalizeGradeTo100(grade: number, scale: GradeScale): number {
	if (scale === 'TWELVE_POINT') return (grade / 12) * 100
	return ((3 * grade - 4) / 12) * 100
}

/**
 * Ранжування з Excel RANK-семантикою: ранг = 1 + кількість строго більших значень;
 * однакові значення отримують однаковий ранг, наступний — пропускається (1,1,3...).
 * Повертає масив рангів у тому ж порядку, що й вхідні значення.
 */
export function assignRanks(scores: number[]): number[] {
	return scores.map(s => 1 + scores.filter(other => other > s).length)
}

/** Середнє з округленням до 2 знаків; null для порожнього списку. */
export function roundedAverage(values: number[]): number | null {
	if (values.length === 0) return null
	return (
		Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) /
		100
	)
}
