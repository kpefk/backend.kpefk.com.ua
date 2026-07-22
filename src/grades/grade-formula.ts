/**
 * Обчислює підказку підсумкової оцінки за ваговою формулою.
 * currentAverage = null (немає поточних оцінок) → повертає examScore як є (clamped).
 * Результат округлюється до цілого і обмежується межами шкали.
 */
export function computeSuggestedGrade(
	currentAverage: number | null,
	examScore: number,
	weights: { currentWeight: number; examWeight: number },
	scale: { min: number; max: number }
): number {
	const raw =
		currentAverage === null
			? examScore
			: (currentAverage * weights.currentWeight +
					examScore * weights.examWeight) /
				100
	return Math.min(scale.max, Math.max(scale.min, Math.round(raw)))
}
