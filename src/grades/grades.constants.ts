import { CurriculumSectionType, GradeScale, UserRole } from '@prisma/client'

export const GRADES_ROLES = [
  UserRole.TEACHER,
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

export const ELEVATED_GRADES_ROLES: readonly UserRole[] = [
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
]

export function isElevatedGrades(role: UserRole): boolean {
  return ELEVATED_GRADES_ROLES.includes(role)
}

export const TWELVE_POINT_MIN = 1
export const TWELVE_POINT_MAX = 12

export const FIVE_POINT_MIN = 1
export const FIVE_POINT_MAX = 5

export const MAX_ATTEMPTS = 3

/** Секції ЗСО → 12-бальна шкала; решта → 5-бальна. */
export const SECTION_TO_SCALE: Record<CurriculumSectionType, GradeScale> = {
  [CurriculumSectionType.SECONDARY_EDUCATION]: GradeScale.TWELVE_POINT,
  [CurriculumSectionType.BASIC_OPP]: GradeScale.TWELVE_POINT,
  [CurriculumSectionType.ELECTIVE_OPP]: GradeScale.TWELVE_POINT,
  [CurriculumSectionType.OPTIONAL_COURSES]: GradeScale.TWELVE_POINT,
  [CurriculumSectionType.GENERAL_COMPETENCY]: GradeScale.TWELVE_POINT,
  [CurriculumSectionType.PROFESSIONAL_COMPETENCY]: GradeScale.FIVE_POINT,
  [CurriculumSectionType.ELECTIVE]: GradeScale.FIVE_POINT,
  [CurriculumSectionType.PRACTICE]: GradeScale.FIVE_POINT,
  [CurriculumSectionType.ATTESTATION]: GradeScale.FIVE_POINT,
  [CurriculumSectionType.CFP]: GradeScale.FIVE_POINT,
}
