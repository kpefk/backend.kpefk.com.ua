import { UserRole } from '@prisma/client'

/** Ролі, що працюють з рейтингом успішності (перегляд, додаткові бали, експорт). */
export const RATING_MANAGE_ROLES = [
	UserRole.HEAD_OF_DEPARTMENT,
	UserRole.DEPUTY_DIRECTOR,
	UserRole.DIRECTOR,
	UserRole.ADMINISTRATOR
] as const

/**
 * Чи навчається студент за бюджетні кошти (лише бюджетники беруть участь у рейтингу
 * на стипендію). Значення ЄДЕБО personEducationPaymentTypeName:
 *   «Кошти державного бюджету», «Кошти місцевих (регіональних) бюджетів» → бюджет;
 *   «Кошти фізичних та/або юридичних осіб» → контракт.
 * null (дані ще не синхронізовано) → false.
 */
export function isBudgetPayment(paymentTypeName: string | null): boolean {
	if (!paymentTypeName) return false
	return /бюджет/i.test(paymentTypeName)
}
