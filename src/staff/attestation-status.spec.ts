/**
 * Unit tests for attestation-status — терміни атестації педпрацівників.
 * Pure functions, no Prisma/DB required.
 */
import {
	classifyAttestationStatus,
	computeNextAttestationDate
} from './attestation-status'

describe('computeNextAttestationDate', () => {
	it('додає 5 років', () => {
		expect(
			computeNextAttestationDate(new Date('2024-03-15')).getFullYear()
		).toBe(2029)
	})

	it('зберігає місяць і день', () => {
		const next = computeNextAttestationDate(new Date('2024-11-20'))
		expect(next.getMonth()).toBe(10) // листопад
		expect(next.getDate()).toBe(20)
	})
})

describe('classifyAttestationStatus', () => {
	it('null → NEVER', () => {
		expect(classifyAttestationStatus(null, 2026)).toBe('NEVER')
	})

	it('минулий рік → OVERDUE', () => {
		expect(classifyAttestationStatus(new Date('2025-06-01'), 2026)).toBe(
			'OVERDUE'
		)
	})

	it('поточний рік → DUE', () => {
		expect(classifyAttestationStatus(new Date('2026-09-01'), 2026)).toBe(
			'DUE'
		)
	})

	it('майбутній рік → OK', () => {
		expect(classifyAttestationStatus(new Date('2029-01-01'), 2026)).toBe(
			'OK'
		)
	})
})
