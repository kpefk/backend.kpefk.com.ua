import type { Prisma } from '@prisma/client'

/**
 * Where-фільтр «активного» студента: не відрахований, не в академвідпустці,
 * термін навчання ще не завершено (або не вказано). Спільний для модулів
 * відвідуваності та підгруп — щоб журнал не показував вибулих студентів.
 */
export function activeStudentWhere(): Prisma.StudentWhereInput {
  return {
    expelEducationTypeName: null,
    academicLeaveTypeName: null,
    OR: [{ educationDateEnd: null }, { educationDateEnd: { gte: new Date() } }],
  }
}
