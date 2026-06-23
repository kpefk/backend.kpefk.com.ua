import { UserRole } from '@prisma/client'

/** Ролі, що мають доступ до журналу (викладач — лише власні заняття). */
export const ATTENDANCE_ROLES = [
  UserRole.TEACHER,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

/** Підвищені ролі: можуть редагувати в межах усього семестру + аудит. */
export const ELEVATED_ROLES: readonly UserRole[] = [
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
]

export function isElevated(role: UserRole): boolean {
  return ELEVATED_ROLES.includes(role)
}

/** Шкала поточних оцінок (національна 12-бальна). */
export const GRADE_MIN = 1
export const GRADE_MAX = 12

/** Скільки днів у минуле викладач може заповнювати журнал. */
export const TEACHER_BACKFILL_DAYS = 30
