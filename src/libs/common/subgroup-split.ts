/**
 * Дефолтний рівномірний поділ студентів на N підгруп «за списком» (по 50% на 2
 * підгрупи: 30 → 15/15). Перші блоки — більші при непарній кількості.
 *
 * @param orderedStudentIds студенти, відсортовані стабільно (за ПІБ)
 * @param subgroupCount     кількість підгруп (N ≥ 1)
 * @returns Map studentId → номер підгрупи 1..N
 */
export function defaultSplit(
  orderedStudentIds: string[],
  subgroupCount: number,
): Map<string, number> {
  const n = Math.max(1, subgroupCount)
  const perGroup = Math.max(1, Math.ceil(orderedStudentIds.length / n))
  const map = new Map<string, number>()
  orderedStudentIds.forEach((id, i) => {
    map.set(id, Math.min(n, Math.floor(i / perGroup) + 1))
  })
  return map
}
