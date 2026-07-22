import { ATTESTATION_PERIOD_YEARS } from './attestations.constants'

export type AttestationStatus = 'NEVER' | 'OVERDUE' | 'DUE' | 'OK'

/** Дата наступної чергової атестації = дата атестації + 5 років. */
export function computeNextAttestationDate(attestationDate: Date): Date {
	const next = new Date(attestationDate)
	next.setFullYear(next.getFullYear() + ATTESTATION_PERIOD_YEARS)
	return next
}

/**
 * Класифікує стан атестації викладача відносно референсного року:
 *   NEVER   — жодної атестації (потребує першої);
 *   OVERDUE — наступна атестація припадала на минулі роки;
 *   DUE     — наступна атестація цього року;
 *   OK      — наступна атестація в майбутньому.
 */
export function classifyAttestationStatus(
	nextAttestationDate: Date | null,
	referenceYear: number
): AttestationStatus {
	if (nextAttestationDate === null) return 'NEVER'
	const year = nextAttestationDate.getFullYear()
	if (year < referenceYear) return 'OVERDUE'
	if (year === referenceYear) return 'DUE'
	return 'OK'
}
