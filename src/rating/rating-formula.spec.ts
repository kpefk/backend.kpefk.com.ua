/**
 * Unit tests for rating-formula — рейтинг успішності (формули зі зразка 268.xlsx).
 *
 * Pure functions, no Prisma/DB required.
 * Run: npx jest rating-formula.spec.ts
 */
import {
	assignRanks,
	normalizeGradeTo100,
	roundedAverage
} from './rating-formula'
import { isBudgetPayment } from './rating.constants'

describe('normalizeGradeTo100', () => {
	it('12-бальна шкала: пряме ділення', () => {
		expect(normalizeGradeTo100(12, 'TWELVE_POINT')).toBeCloseTo(100)
		expect(normalizeGradeTo100(6, 'TWELVE_POINT')).toBeCloseTo(50)
		expect(normalizeGradeTo100(10, 'TWELVE_POINT')).toBeCloseTo(83.333, 2)
	})

	it('5-бальна шкала: через 3g−4 (звірено з 268.xlsx)', () => {
		expect(normalizeGradeTo100(5, 'FIVE_POINT')).toBeCloseTo(91.667, 2) // 11/12
		expect(normalizeGradeTo100(4, 'FIVE_POINT')).toBeCloseTo(66.667, 2) // 8/12
		expect(normalizeGradeTo100(3, 'FIVE_POINT')).toBeCloseTo(41.667, 2) // 5/12
	})

	it('звірка з файлом: Басик (10,8,8,8,10 на 12-б + 5,5,4,4,5,5 на 5-б) → бал 78.79', () => {
		const twelves = [10, 8, 8, 8, 10].map(g =>
			normalizeGradeTo100(g, 'TWELVE_POINT')
		)
		const fives = [5, 5, 4, 4, 5, 5].map(g =>
			normalizeGradeTo100(g, 'FIVE_POINT')
		)
		expect(roundedAverage([...twelves, ...fives])).toBeCloseTo(78.79, 2)
	})
})

describe('assignRanks (Excel RANK-семантика)', () => {
	it('однакові значення → однаковий ранг, наступний пропускається', () => {
		expect(assignRanks([90, 85, 85, 70])).toEqual([1, 2, 2, 4])
	})

	it('порожній список → порожній результат', () => {
		expect(assignRanks([])).toEqual([])
	})

	it('усі однакові → всі перші', () => {
		expect(assignRanks([50, 50, 50])).toEqual([1, 1, 1])
	})
})

describe('roundedAverage', () => {
	it('порожній список → null', () => {
		expect(roundedAverage([])).toBeNull()
	})

	it('округлення до 2 знаків', () => {
		expect(roundedAverage([1, 2])).toBe(1.5)
	})
})

describe('isBudgetPayment', () => {
	it('бюджетні джерела → true', () => {
		expect(isBudgetPayment('Кошти державного бюджету')).toBe(true)
		expect(isBudgetPayment('Кошти місцевих (регіональних) бюджетів')).toBe(
			true
		)
	})

	it('контракт → false', () => {
		expect(isBudgetPayment('Кошти фізичних та/або юридичних осіб')).toBe(
			false
		)
	})

	it('null (не синхронізовано) → false', () => {
		expect(isBudgetPayment(null)).toBe(false)
	})
})
