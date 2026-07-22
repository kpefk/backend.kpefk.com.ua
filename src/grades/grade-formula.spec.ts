/**
 * Unit tests for grade-formula — вагова формула підказки підсумкової оцінки.
 *
 * Pure functions, no Prisma/DB required.
 * Run: npx jest grade-formula.spec.ts
 */
import { computeSuggestedGrade } from './grade-formula'

describe('computeSuggestedGrade', () => {
	it('currentAverage = null → повертає examScore як є (clamped)', () => {
		expect(
			computeSuggestedGrade(
				null,
				9,
				{ currentWeight: 60, examWeight: 40 },
				{ min: 1, max: 12 }
			)
		).toBe(9)
	})

	it('60/40 звичайний випадок (12-бальна шкала)', () => {
		// 8×0.6 + 10×0.4 = 4.8 + 4 = 8.8 → round → 9
		expect(
			computeSuggestedGrade(
				8,
				10,
				{ currentWeight: 60, examWeight: 40 },
				{ min: 1, max: 12 }
			)
		).toBe(9)
	})

	it('70/30 звичайний випадок (5-бальна шкала)', () => {
		// 4×0.7 + 5×0.3 = 2.8 + 1.5 = 4.3 → round → 4
		expect(
			computeSuggestedGrade(
				4,
				5,
				{ currentWeight: 70, examWeight: 30 },
				{ min: 1, max: 5 }
			)
		).toBe(4)
	})

	it('обмежує результат зверху межею шкали', () => {
		expect(
			computeSuggestedGrade(
				12,
				12,
				{ currentWeight: 60, examWeight: 40 },
				{ min: 1, max: 12 }
			)
		).toBe(12)
	})

	it('обмежує результат знизу межею шкали', () => {
		expect(
			computeSuggestedGrade(
				0,
				0,
				{ currentWeight: 60, examWeight: 40 },
				{ min: 1, max: 12 }
			)
		).toBe(1)
	})
})
