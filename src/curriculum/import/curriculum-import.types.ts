// Структуровані типи результату парсингу навчального плану з .xls.
// Це проміжне (dry-run) представлення — НЕ доменні сутності Prisma.
// Мапінг у CurriculumVersion/Section/Component/Term виконується окремим кроком
// після візуальної звірки цього JSON з оригінальним файлом.

/** Частина плану: профільна середня освіта (ЗСО) чи освітньо-професійна програма (ОПП). */
export type CurriculumPart = 'SECONDARY' | 'PROFESSIONAL'

/** Семестр + кількість тижнів (з шапки аркуша «План»). */
export interface ParsedSemester {
  semesterNumber: number
  courseNumber: number
  weeks: number | null
}

/** Розподіл компонента в одному семестрі. */
export interface ParsedTerm {
  semesterNumber: number
  /** Години в семестрі (чисельник у «34/2»). */
  hours: number
  /** Годин на тиждень (знаменник у «34/2»); null якщо без знаменника (напр. практика «90»). */
  hoursPerWeek: number | null
}

/** Один освітній компонент (дисципліна / практика / атестація / предмет ЗСО). */
export interface ParsedComponent {
  /** Код з колонки A: "1.", "ОК1", "ВК1" або null. */
  code: string | null
  name: string
  /** Маркер відображення («*») для інтегрованих освітніх компонентів; null якщо немає. */
  displayMarker: string | null
  /** Код ОПП-компонента, з яким інтегровано предмет ЗСО (з «(ОКn)» у назві); null якщо немає. */
  integratedWithCode: string | null
  /** true для рядків-заглушок альтернатив «Дисципліна 2/3» з «*». */
  isElectivePlaceholder: boolean
  /** true якщо рядок належить вибірковому блоку (ВК…). */
  isElective: boolean
  /** Код вибіркового блоку, до якого належить альтернатива ("ВК1" …), якщо є. */
  electiveGroupCode: string | null

  /** Семестри з екзаменом (колонка «Екзамени»). */
  examSemesters: number[]
  /** Семестри з заліком (колонка «Заліки»). */
  creditSemesters: number[]
  /** Семестри з курсовою роботою/проєктом (колонка «Курсові»). */
  courseWorkSemesters: number[]
  /** Сирий текст колонки екзаменів, якщо містить не лише цифри (напр. «4ДПА»). */
  rawExam: string | null

  totalHours: number | null
  ects: number | null
  auditoryHours: number | null
  lectureHours: number | null
  practicalHours: number | null
  seminarHours: number | null
  labHours: number | null
  selfStudyHours: number | null
  otherHours: number | null

  terms: ParsedTerm[]

  /** Номер рядка в аркуші (1-based) — для діагностики. */
  sourceRow: number
}

/** Розділ плану («Базові компоненти ОПП», «Технології:» тощо). */
export interface ParsedSection {
  name: string
  part: CurriculumPart
  components: ParsedComponent[]
  /** Підсумковий рядок «Всього» для цього розділу, якщо знайдено (для звірки). */
  subtotal: ParsedSubtotal | null
  sourceRow: number
}

/** Рядок «Всього» — для верифікації сум, не імпортується як компонент. */
export interface ParsedSubtotal {
  label: string
  totalHours: number | null
  ects: number | null
  sourceRow: number
}

/** Рядок зведеного бюджету часу (аркуш «титулка»). */
export interface ParsedTimeBudgetRow {
  courseLabel: string
  theoryWeeks: number | null
  sessionWeeks: number | null
  practiceWeeks: number | null
  attestationWeeks: number | null
  holidayWeeks: number | null
  totalWeeks: number | null
}

/** Повний результат парсингу одного файлу. */
export interface ParsedCurriculum {
  meta: {
    sourceFile: string
    /** Навчальний рік, витягнутий з назви файлу (напр. "2025-2026"), якщо вдалось. */
    academicYear: string | null
    /** Назва спеціальності з назви файлу/титулки, якщо вдалось. */
    specialtyName: string | null
  }
  semesters: ParsedSemester[]
  sections: ParsedSection[]
  timeBudget: ParsedTimeBudgetRow[]
  /** Нежорсткі попередження (SOFT WARN): незвіряні суми, невпізнані рядки тощо. */
  warnings: string[]
}
