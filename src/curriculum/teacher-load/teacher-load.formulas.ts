import type {
  ComponentType,
  CurriculumSectionType,
  ExamFormat,
  PracticeType,
  TermControlForm,
} from '@prisma/client'

import {
  NORM_CONTROL_WORK_AUDITORY_HOURS,
  NORM_CONTROL_WORK_INDEPENDENT_HOURS,
  NORM_COURSE_PROJECT_GENERAL_HOURS_PER_STUDENT,
  NORM_COURSE_PROJECT_PROFESSIONAL_HOURS_PER_STUDENT,
  NORM_COURSE_WORK_HOURS_PER_STUDENT,
  NORM_CREDIT_HOURS_PER_GROUP,
  NORM_DIPLOMA_SUPERVISION_HOURS_TOTAL,
  NORM_EDUCATIONAL_PRACTICE_HOURS_PER_WEEK,
  NORM_EXAM_ORAL_HOURS_PER_STUDENT,
  NORM_EXAM_WRITTEN_HOURS_PER_GROUP,
  NORM_EXAM_WRITTEN_HOURS_PER_STUDENT,
  NORM_PRE_CONTROL_CONSULTATION_HOURS_PER_GROUP,
  NORM_PRODUCTION_PRACTICE_HOURS_PER_STUDENT_PER_WEEK,
} from './teacher-load.constants'

/**
 * Обчислює години проведення семестрового контролю (Наказ МОН №686, п.14/16).
 *
 * CREDIT/GRADED_CREDIT → 2 год на групу (п.14).
 * EXAM + ORAL          → 0.33 год на студента (п.16, усно).
 * EXAM + WRITTEN       → 3 год на групу + 0.5 год на роботу (п.16, письмово).
 * EXAM + examFormat=null → 0 (формат ще не налаштовано заступником директора).
 *
 * @param groupCount  Кількість академічних груп, що проходять цей контроль окремо.
 * @param studentCount Сумарна кількість студентів у цих групах.
 */
export function computeSemesterControlHours(
  controlForm: TermControlForm | null,
  examFormat: ExamFormat | null,
  groupCount: number,
  studentCount: number,
): number {
  if (controlForm === 'CREDIT' || controlForm === 'GRADED_CREDIT') {
    return NORM_CREDIT_HOURS_PER_GROUP * groupCount
  }
  if (controlForm === 'EXAM') {
    if (examFormat === 'ORAL') {
      return NORM_EXAM_ORAL_HOURS_PER_STUDENT * studentCount
    }
    if (examFormat === 'WRITTEN') {
      return NORM_EXAM_WRITTEN_HOURS_PER_GROUP * groupCount +
        NORM_EXAM_WRITTEN_HOURS_PER_STUDENT * studentCount
    }
    return 0
  }
  return 0
}

/**
 * Обчислює години перевірки контрольних (модульних) робіт (Наказ МОН №686, п.11–12).
 * «Робота» = один папір одного студента, тому множник — кількість студентів.
 */
export function computeControlWorksCheckHours(
  auditoryCount: number,
  independentCount: number,
  studentCount: number,
): number {
  return (
    auditoryCount * studentCount * NORM_CONTROL_WORK_AUDITORY_HOURS +
    independentCount * studentCount * NORM_CONTROL_WORK_INDEPENDENT_HOURS
  )
}

/**
 * Обчислює години керівництва практикою (Наказ МОН №686, п.17–18).
 *
 * EDUCATIONAL (навчальна практика) → 18 год/тиждень на групу АБО на кожну підгрупу (п.17) —
 *   множиться на subgroupCount, бо кожна підгрупа веде свій керівник за повну норму.
 * TECHNOLOGICAL/PRE_GRADUATION (виробнича, переддипломна) → 1 год/студента/тиждень (п.18) —
 *   НЕ множиться на subgroupCount: studentCount вже визначає сумарний обсяг незалежно від
 *   того, скільки керівників (баз практики) розподіляють цих студентів між собою.
 * componentType ≠ PRACTICE, durationWeeks не вказано, або practiceType не вказано → 0.
 *
 * @param subgroupCount Кількість підгруп (1 = без поділу). Застосовується лише для EDUCATIONAL.
 */
export function computePracticeSupervisionHours(
  componentType: ComponentType,
  practiceType: PracticeType | null,
  durationWeeks: number | null,
  studentCount: number,
  subgroupCount = 1,
): number {
  if (componentType !== 'PRACTICE' || durationWeeks === null || durationWeeks <= 0) return 0
  if (practiceType === 'EDUCATIONAL') {
    const sub = subgroupCount >= 2 ? subgroupCount : 1
    return NORM_EDUCATIONAL_PRACTICE_HOURS_PER_WEEK * durationWeeks * sub
  }
  if (practiceType === 'TECHNOLOGICAL' || practiceType === 'PRE_GRADUATION') {
    return NORM_PRODUCTION_PRACTICE_HOURS_PER_STUDENT_PER_WEEK * durationWeeks * studentCount
  }
  return 0
}

/**
 * Обчислює години керівництва курсовими роботами/проєктами (Наказ МОН №686, п.13).
 *
 * Курсова робота  → 3 год/студента незалежно від типу дисципліни.
 * Курсовий проєкт → 3 год/студента (загальнотехнічні дисципліни, GENERAL_COMPETENCY)
 *                    або 4 год/студента (фахові — усі інші секції).
 * Якщо термін одночасно має і курсову роботу, і курсовий проєкт (нетиповий випадок) —
 * норми додаються.
 */
export function computeCourseWorkSupervisionHours(
  hasCourseWork: boolean,
  hasCourseProject: boolean,
  sectionType: CurriculumSectionType,
  studentCount: number,
): number {
  let hours = 0
  if (hasCourseWork) {
    hours += NORM_COURSE_WORK_HOURS_PER_STUDENT * studentCount
  }
  if (hasCourseProject) {
    const rate = sectionType === 'GENERAL_COMPETENCY'
      ? NORM_COURSE_PROJECT_GENERAL_HOURS_PER_STUDENT
      : NORM_COURSE_PROJECT_PROFESSIONAL_HOURS_PER_STUDENT
    hours += rate * studentCount
  }
  return hours
}

/**
 * Обчислює години одного керівника/консультанта дипломної роботи (Наказ МОН №686, п.20).
 * Спільний пул 16 год ділиться порівну між усіма призначеними цьому студенту
 * (керівник + консультанти) — наказ не деталізує пропорцію розподілу.
 */
export function computeDiplomaSupervisionHoursPerAssignee(assigneeCount: number): number {
  if (assigneeCount <= 0) return 0
  return NORM_DIPLOMA_SUPERVISION_HOURS_TOTAL / assigneeCount
}

/**
 * Обчислює години консультацій перед семестровим контролем (Наказ МОН №686, п.10).
 * 2 год на групу перед кожним заліком/диф.заліком/екзаменом, незалежно від формату.
 */
export function computePreControlConsultationHours(
  controlForm: TermControlForm | null,
  groupCount: number,
): number {
  if (controlForm === 'CREDIT' || controlForm === 'GRADED_CREDIT' || controlForm === 'EXAM') {
    return NORM_PRE_CONTROL_CONSULTATION_HOURS_PER_GROUP * groupCount
  }
  return 0
}
