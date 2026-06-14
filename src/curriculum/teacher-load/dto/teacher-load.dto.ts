// ─── Nested shapes (plain classes — not validated, only serialized) ────────────

export class TeacherSummaryDto {
  id!: string
  firstName!: string
  lastName!: string
  middleName!: string | null
  /** Кваліфікаційна категорія (напр. «Спеціаліст вищої категорії») */
  skillName!: string | null
  /** Посада (напр. «Викладач») */
  positionName!: string | null
  /** Назва кафедри/відділення */
  departmentName!: string | null
  /**
   * Ставка викладача (0.25–1.5).
   * Пропорційно визначає ліміт: 720 × rate год/рік.
   */
  rate!: number
}

export class HoursPerGroupDto {
  /** Лекції на 1 групу (год) */
  lecture!: number
  /** Практичні + лабораторні на 1 групу (год) */
  practicalLab!: number
  /** Семінарські на 1 групу (год) */
  seminar!: number
  /** СПРС (самостійна робота під керівництвом) на 1 групу (год) */
  independent!: number
  /** Консультації (підготовка до іспиту) на 1 групу (год) */
  examPrep!: number
}

export class TotalHoursDto {
  /** Лекції × 1 (потоковий формат) */
  lecture!: number
  /** (Практичні + лабораторні) × groupCount */
  practicalLab!: number
  /** Семінарські × groupCount */
  seminar!: number
  /** СПРС × groupCount */
  independent!: number
  /** Консультації × groupCount */
  examPrep!: number
  /** Сума навчального навантаження по компоненту */
  subtotal!: number
}

export class LoadComponentDto {
  componentCode!: string | null
  componentName!: string
  semesterNumber!: number
  groupCount!: number
  /** Загальна кількість студентів по всіх групах */
  studentCount!: number
  hoursPerGroup!: HoursPerGroupDto
  totalHours!: TotalHoursDto
}

export class TeacherLoadSummaryDto {
  /** Навчальне навантаження: лекції + практ/лаб + семінари + СПРС + консультації */
  totalTeachingHours!: number
  /** Ліміт навчального навантаження: 720 × rate (год/рік) */
  teachingHoursLimit!: number
  /** true якщо totalTeachingHours > teachingHoursLimit */
  teachingHoursExceeded!: boolean
  /** Кількість різних дисциплін (для контролю рекомендації ≤ 5 з Наказу №686) */
  disciplineCount!: number
  /**
   * Інформаційні сигнали (не блокуючі):
   *   «Перевищено 720 год навантаження» | «Більше 5 дисциплін»
   */
  warnings!: string[]
}

export class TeacherLoadEntryDto {
  /** null — компоненти без призначеного викладача */
  teacher!: TeacherSummaryDto | null
  summary!: TeacherLoadSummaryDto
  components!: LoadComponentDto[]
}

export class TeacherLoadDto {
  workingCurriculumId!: string
  academicYear!: string
  /** ISO datetime момент генерації */
  generatedAt!: string
  teachers!: TeacherLoadEntryDto[]
}

// ─── My load (для викладача на dashboard) ──────────────────────────────────────

export class MyLoadPlanDto {
  workingCurriculumId!: string
  academicYear!: string
  /** Людська назва плану: "F3 Комп'ютерні науки (2024-2025)" */
  label!: string
  totalTeachingHours!: number
  components!: LoadComponentDto[]
}

export class MyTeacherLoadDto {
  /** null — у користувача немає профілю викладача */
  teacher!: TeacherSummaryDto | null
  academicYear!: string | null
  totalTeachingHours!: number
  teachingHoursLimit!: number
  teachingHoursExceeded!: boolean
  disciplineCount!: number
  plans!: MyLoadPlanDto[]
}

// ─── All-teachers summary (для керівництва) ────────────────────────────────────

export class AllTeachersLoadRowDto {
  teacher!: TeacherSummaryDto
  totalTeachingHours!: number
  teachingHoursLimit!: number
  teachingHoursExceeded!: boolean
  disciplineCount!: number
  /** Кількість робочих планів, у яких задіяний викладач */
  workingCurriculumCount!: number
}

export class AllTeachersLoadDto {
  academicYear!: string
  generatedAt!: string
  /** Відсортовано за спаданням totalTeachingHours */
  rows!: AllTeachersLoadRowDto[]
  /** Скільки освітніх компонентів без призначеного викладача (рік) */
  unassignedComponents!: number
}
