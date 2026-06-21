import { DiplomaGrade } from '@prisma/client'

/** Двомовні підписи оцінок для додатка (§4.3). */
export const GRADE_LABELS: Record<DiplomaGrade, { uk: string; en: string }> = {
  EXCELLENT: { uk: 'Відмінно', en: 'Excellent' },
  GOOD: { uk: 'Добре', en: 'Good' },
  SATISFACTORY: { uk: 'Задовільно', en: 'Satisfactory' },
  PASSED: { uk: 'Зараховано', en: 'Passed' },
}

/**
 * Поріг диплома з відзнакою (§4.5): не менше 75% оцінок «Відмінно»
 * з усіх ОК та практичної підготовки.
 */
export const HONORS_EXCELLENT_RATIO = 0.75
