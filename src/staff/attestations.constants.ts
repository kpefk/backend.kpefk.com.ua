import { UserRole } from '@prisma/client'

/**
 * Ролі, що керують атестацією (кадрова функція — обмежено, на відміну від
 * відкритого qualification-upgrades).
 */
export const STAFF_MANAGE_ROLES = [
	UserRole.HEAD_OF_DEPARTMENT,
	UserRole.DEPUTY_DIRECTOR,
	UserRole.DIRECTOR,
	UserRole.ADMINISTRATOR
] as const

/** Періодичність чергової атестації (Ст. 50 №2145-VIII, Ст. 59 №2745-VIII). */
export const ATTESTATION_PERIOD_YEARS = 5

/** Довідник стандартних кваліфікаційних категорій (UI-підказка; можна ввести «Інше»). */
export const STANDARD_CATEGORIES: readonly string[] = [
	'Спеціаліст',
	'Спеціаліст другої категорії',
	'Спеціаліст першої категорії',
	'Спеціаліст вищої категорії'
]

/** Довідник стандартних педагогічних звань (UI-підказка). */
export const STANDARD_TITLES: readonly string[] = [
	'Старший викладач',
	'Викладач-методист'
]
