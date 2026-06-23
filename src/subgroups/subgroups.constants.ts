import { UserRole } from '@prisma/client'

/** Ролі, що керують поділом на підгрупи (як і розкладом/навчальними планами). */
export const SUBGROUP_MANAGER_ROLES = [
  UserRole.SCHEDULE_DISPATCHER,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

/** Максимальна кількість підгруп у дисципліні. */
export const MAX_SUBGROUPS = 4

/** Значення для «вся група» / «не призначено» у номері підгрупи. */
export const NO_SUBGROUP = 0
