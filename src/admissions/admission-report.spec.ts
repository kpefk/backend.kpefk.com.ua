import {
  type AdmissionAppLike,
  bucketKonkurs,
  funnelCounts,
  splitBudgetContract,
} from './admission-report'

function app(p: Partial<AdmissionAppLike>): AdmissionAppLike {
  return {
    konkursValue: null,
    isClaimForBudget: null,
    isClaimForContract: null,
    budgetRecommendationTypeId: null,
    isOriginalDocumentsAdded: null,
    orderOfEnrollmentId: null,
    ...p,
  }
}

describe('bucketKonkurs', () => {
  it('порожній масив → []', () => {
    expect(bucketKonkurs([], 20)).toEqual([])
  })

  it('розбиває на відрізки ширини size', () => {
    const b = bucketKonkurs([100, 110, 135, 180, 199], 20)
    // min=100, max=200 → [100-120),[120-140),[140-160),[160-180),[180-200)
    expect(b.map((x) => x.count)).toEqual([2, 1, 0, 0, 2])
    expect(b[0]).toEqual({ from: 100, to: 120, count: 2 })
  })

  it('максимум потрапляє в останній bucket', () => {
    const b = bucketKonkurs([120, 200], 20) // min=120,max=200
    expect(b[b.length - 1]!.count).toBe(1) // 200 у останньому
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(2)
  })
})

describe('funnelCounts', () => {
  it('рахує кожен рівень воронки', () => {
    const apps = [
      app({ budgetRecommendationTypeId: 1, isOriginalDocumentsAdded: true, orderOfEnrollmentId: 5 }),
      app({ budgetRecommendationTypeId: 1, isOriginalDocumentsAdded: true }),
      app({ budgetRecommendationTypeId: 1 }),
      app({}),
    ]
    expect(funnelCounts(apps)).toEqual({
      submitted: 4,
      recommendedBudget: 3,
      requirementsMet: 2,
      enrolled: 1,
    })
  })

  it('порожньо → усі нулі', () => {
    expect(funnelCounts([])).toEqual({
      submitted: 0,
      recommendedBudget: 0,
      requirementsMet: 0,
      enrolled: 0,
    })
  })
})

describe('splitBudgetContract', () => {
  it('розділяє бюджет / контракт / обидва', () => {
    const apps = [
      app({ isClaimForBudget: true }),
      app({ isClaimForContract: true }),
      app({ isClaimForBudget: true, isClaimForContract: true }),
      app({}),
    ]
    expect(splitBudgetContract(apps)).toEqual({ budget: 1, contract: 1, both: 1 })
  })
})
