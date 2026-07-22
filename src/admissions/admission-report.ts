/**
 * Чисті функції агрегації звітів вступної кампанії (unit-тестуються без БД).
 */

/** Мінімальна проекція заяви, потрібна для агрегатів. */
export interface AdmissionAppLike {
  konkursValue: number | null
  isClaimForBudget: boolean | null
  isClaimForContract: boolean | null
  budgetRecommendationTypeId: number | null
  isOriginalDocumentsAdded: boolean | null
  orderOfEnrollmentId: number | null
}

export interface KonkursBucket {
  from: number
  to: number
  count: number
}

/**
 * Гістограма конкурсних балів: рівні відрізки ширини `size` в межах [min, max].
 * Значення на верхній межі відрізка потрапляє в останній bucket.
 */
export function bucketKonkurs(values: number[], size = 20): KonkursBucket[] {
  const nums = values.filter((v) => Number.isFinite(v))
  if (nums.length === 0 || size <= 0) return []

  const min = Math.floor(Math.min(...nums) / size) * size
  const max = Math.ceil(Math.max(...nums) / size) * size
  const spanEnd = max === min ? min + size : max

  const buckets: KonkursBucket[] = []
  for (let from = min; from < spanEnd; from += size) {
    buckets.push({ from, to: from + size, count: 0 })
  }
  for (const v of nums) {
    let idx = Math.floor((v - min) / size)
    if (idx >= buckets.length) idx = buckets.length - 1
    if (idx < 0) idx = 0
    buckets[idx]!.count++
  }
  return buckets
}

export interface AdmissionFunnel {
  submitted: number
  recommendedBudget: number
  requirementsMet: number
  enrolled: number
}

/**
 * Воронка вступу: подано → рекомендовано на бюджет → виконав вимоги до зарахування
 * → зараховано (є наказ про зарахування).
 */
export function funnelCounts(apps: AdmissionAppLike[]): AdmissionFunnel {
  let recommendedBudget = 0
  let requirementsMet = 0
  let enrolled = 0
  for (const a of apps) {
    if (a.budgetRecommendationTypeId !== null) recommendedBudget++
    if (a.isOriginalDocumentsAdded === true) requirementsMet++
    if (a.orderOfEnrollmentId !== null) enrolled++
  }
  return { submitted: apps.length, recommendedBudget, requirementsMet, enrolled }
}

export interface BudgetContractSplit {
  budget: number
  contract: number
  both: number
}

/** Розподіл заяв за претензією на бюджет / контракт (за прапорцями заяви). */
export function splitBudgetContract(apps: AdmissionAppLike[]): BudgetContractSplit {
  let budget = 0
  let contract = 0
  let both = 0
  for (const a of apps) {
    const b = a.isClaimForBudget === true
    const c = a.isClaimForContract === true
    if (b && c) both++
    else if (b) budget++
    else if (c) contract++
  }
  return { budget, contract, both }
}
