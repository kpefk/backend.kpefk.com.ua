/**
 * Нормативи педагогічного навантаження.
 * Ст. 60 Закону №2745-VIII «Про фахову передвищу освіту».
 * Наказ МОН №686 від 18.06.2021.
 */

/**
 * Базова норма навчального навантаження на 1.0 ставку (год/рік).
 * Ставка може бути від 0.25 до 1.5:
 *   - 0.25 ставки → 180 год
 *   - 0.5  ставки → 360 год
 *   - 1.0  ставки → 720 год
 *   - 1.5  ставки → 1080 год
 */
export const NORM_TEACHING_HOURS_PER_RATE = 720

/**
 * Рекомендована максимальна кількість різних дисциплін на викладача.
 * Наказ МОН №686, рекомендований (не жорсткий) норматив.
 */
export const NORM_MAX_DISCIPLINES = 5

/**
 * Максимальна частка консультацій від загального обсягу дисципліни.
 * Наказ МОН №686, п.9:
 *   - денна форма навчання  → 2% від обсягу дисципліни
 *   - заочна / дистанційна  → 6% від обсягу дисципліни
 */
export const NORM_CONSULTATION_RATIO_FULL_TIME = 0.02
export const NORM_CONSULTATION_RATIO_DISTANCE   = 0.06

/**
 * Мінімальна кількість студентів у підгрупі для практ./лаб. занять.
 * Наказ МОН №686, п.5–6.
 * Для мистецьких/медичних спеціальностей — вдвічі менше (не реалізовано окремо).
 */
export const MIN_SUBGROUP_SIZE = 10

/**
 * Мінімальна кількість студентів у підгрупі для навчальної практики.
 * Наказ МОН №686, п.17.
 */
export const MIN_PRACTICE_SUBGROUP_SIZE = 12

/**
 * Максимальна дозволена кількість підгруп на одну академічну групу.
 * Наказ МОН №686, п.5–6: тільки 2 підгрупи.
 */
export const MAX_SUBGROUP_COUNT = 2

/**
 * Обчислює індивідуальний ліміт навчального навантаження.
 * @param rate  Ставка викладача (0.25 – 1.5). @default 1.0
 * @returns     Ліміт у годинах за рік.
 */
export function teachingHoursLimit(rate: number): number {
  return Math.round(NORM_TEACHING_HOURS_PER_RATE * rate)
}

/**
 * Норми проведення семестрового заліку (Наказ МОН №686, п.14).
 * Заліки і диференційовані заліки — однакова норма.
 */
export const NORM_CREDIT_HOURS_PER_GROUP = 2

/**
 * Норми проведення семестрового екзамену (Наказ МОН №686, п.16).
 */
export const NORM_EXAM_ORAL_HOURS_PER_STUDENT = 0.33
export const NORM_EXAM_WRITTEN_HOURS_PER_GROUP = 3
export const NORM_EXAM_WRITTEN_HOURS_PER_STUDENT = 0.5

/**
 * Норми перевірки контрольних (модульних) робіт (Наказ МОН №686, п.11–12).
 * «Робота» = один папір одного студента.
 */
export const NORM_CONTROL_WORK_AUDITORY_HOURS = 0.25
export const NORM_CONTROL_WORK_INDEPENDENT_HOURS = 0.33

/**
 * Норми керівництва практикою (Наказ МОН №686, п.17–18).
 * Навчальна практика — на групу/підгрупу за тиждень.
 * Виробнича/технологічна/переддипломна — на студента за тиждень (керівник від закладу).
 */
export const NORM_EDUCATIONAL_PRACTICE_HOURS_PER_WEEK = 18
export const NORM_PRODUCTION_PRACTICE_HOURS_PER_STUDENT_PER_WEEK = 1

/**
 * Норми керівництва курсовими роботами/проєктами (Наказ МОН №686, п.13).
 * «Одна робота» = курсова робота/проєкт одного студента.
 * Курсовий проєкт: загальнотехнічні дисципліни (GENERAL_COMPETENCY) — менша норма,
 * фахові — більша.
 */
export const NORM_COURSE_WORK_HOURS_PER_STUDENT = 3
export const NORM_COURSE_PROJECT_GENERAL_HOURS_PER_STUDENT = 3
export const NORM_COURSE_PROJECT_PROFESSIONAL_HOURS_PER_STUDENT = 4

/**
 * Норми керівництва дипломними роботами (Наказ МОН №686, п.20).
 * Керівник+консультанти ділять спільний пул 16 год на студента.
 * Члени комісії захисту — фіксовано 0.5 год кожному, незалежно від розміру комісії.
 * Рецензент і представник бази практики НЕ трекаються (завжди зовнішні особи —
 * Положення про кваліфікаційні роботи ВСП «КПЕФК ЛНТУ», п.3.4: «Рецензент ДП/ДР
 * не повинен бути співробітником коледжу»).
 */
export const NORM_DIPLOMA_SUPERVISION_HOURS_TOTAL = 16
export const NORM_DIPLOMA_COMMITTEE_HOURS_PER_MEMBER = 0.5
/** Рекомендований максимум дипломних робіт на одного керівника. */
export const NORM_MAX_DIPLOMA_WORKS_PER_TEACHER = 8

/**
 * Норма консультацій перед семестровим контролем (Наказ МОН №686, п.10).
 * 2 год на групу перед кожним заліком/диф.заліком/екзаменом, незалежно від формату.
 */
export const NORM_PRE_CONTROL_CONSULTATION_HOURS_PER_GROUP = 2
