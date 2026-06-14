import * as XLSX from 'xlsx'

import {
  CurriculumPart,
  ParsedComponent,
  ParsedCurriculum,
  ParsedSection,
  ParsedSemester,
  ParsedSubtotal,
  ParsedTerm,
  ParsedTimeBudgetRow,
} from './curriculum-import.types'

/**
 * Парсер навчального плану КПЕФК з .xls (аркуші «План» + «титулка»).
 *
 * Чому динамічне визначення колонок: між роками розкладка «пливе» — у 2025-2026
 * додано колонку «Інші види роботи», що зсуває семестрові колонки на одну.
 * Тому колонки шукаємо за текстом шапки та маркером «семестр тижнів», а не за
 * фіксованими літерами.
 */

type Matrix = string[][]

const norm = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim()

/**
 * Розбирає назву компонента: витягує маркер інтеграції «*» та код «(ОКn)».
 * Інтегровані предмети ЗСО позначаються «*» і посиланням на ОПП-компонент,
 * напр. «* Громадянська освіта (ОК9)» → name="Громадянська освіта",
 * displayMarker="*", integratedWithCode="ОК9".
 */
function parseComponentName(raw: string): {
  name: string
  displayMarker: string | null
  integratedWithCode: string | null
} {
  let name = raw.trim()
  let displayMarker: string | null = null
  let integratedWithCode: string | null = null

  if (name.startsWith('*')) {
    displayMarker = '*'
    name = name.replace(/^\*\s*/, '')
  }

  // Посилання на інтегрований ОПП-компонент у кінці: «(ОК9)».
  const ref = name.match(/\(\s*(ОК\s*\d+)\s*\)\s*$/i)
  if (ref) {
    integratedWithCode = ref[1].replace(/\s+/g, '').toUpperCase()
    name = name.replace(/\(\s*ОК\s*\d+\s*\)\s*$/i, '').trim()
  }

  return { name, displayMarker, integratedWithCode }
}

const lower = (v: unknown): string => norm(v).toLowerCase()

/** Чи виглядає значення як число (можливо з комою/крапкою). */
function toNumber(v: unknown): number | null {
  const s = norm(v).replace(',', '.')
  if (!s) return null
  const m = s.match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

/** Витягує всі номери семестрів із тексту типу «1 2 3 4» / «4ДПА» / «5,6». */
function parseSemesterList(v: unknown): number[] {
  const s = norm(v)
  if (!s) return []
  const nums = s.match(/\d+/g)
  return nums ? nums.map(Number).filter((n) => n >= 1 && n <= 12) : []
}

interface ColumnMap {
  code: number
  name: number
  exam: number
  credit: number
  courseWork: number
  totalHours: number
  ects: number
  auditory: number
  lecture: number
  practical: number
  seminar: number
  lab: number
  selfStudy: number
  other: number | null
  /** semesterNumber → columnIndex */
  semesterCols: Map<number, number>
  /** Останній рядок шапки (0-based); тіло починається після нього. */
  headerEndRow: number
}

/** Знаходить індекс колонки, у будь-якому з рядків шапки якої трапляється підрядок. */
function findCol(
  header: Matrix,
  predicate: (cellLower: string) => boolean,
): number {
  for (let r = 0; r < header.length; r++) {
    const row = header[r] ?? []
    for (let c = 0; c < row.length; c++) {
      if (predicate(lower(row[c]))) return c
    }
  }
  return -1
}

/**
 * Визначає розкладку колонок з багаторядкової шапки.
 * Очікує, що шапка займає верхні ~7 рядків аркуша «План».
 */
function detectColumns(rows: Matrix): ColumnMap {
  const HEADER_SCAN = Math.min(rows.length, 9)
  const header = rows.slice(0, HEADER_SCAN)

  // Рядок-маркер семестрів: містить «семестр тижнів» у кількох клітинках.
  let semesterMarkerRow = -1
  for (let r = 0; r < HEADER_SCAN; r++) {
    const count = (header[r] ?? []).filter((c) => lower(c).includes('семестр')).length
    if (count >= 2) {
      semesterMarkerRow = r
      break
    }
  }

  const semesterCols = new Map<number, number>()
  if (semesterMarkerRow >= 0) {
    // Колонки семестрів — там, де в маркер-рядку є «семестр».
    // Номер семестра беремо з рядка під маркером (1,2,…,8), якщо є, інакше — зліва направо.
    const numbersRow = header[semesterMarkerRow - 1] ?? []
    const markerCells: number[] = []
    ;(header[semesterMarkerRow] ?? []).forEach((c, idx) => {
      if (lower(c).includes('семестр')) markerCells.push(idx)
    })
    markerCells.forEach((colIdx, i) => {
      const explicit = toNumber(numbersRow[colIdx])
      const semNo = explicit && explicit >= 1 && explicit <= 12 ? explicit : i + 1
      semesterCols.set(semNo, colIdx)
    })
  }

  const map: ColumnMap = {
    code: findCol(header, (s) => s.includes('код') || s === '№ з/п' || s.includes('з/п')),
    name: findCol(header, (s) => s.includes('назва') || s.includes('найменування')),
    exam: findCol(header, (s) => s.includes('екзамен')),
    credit: findCol(header, (s) => s.includes('залік')),
    courseWork: findCol(header, (s) => s.includes('курсов')),
    totalHours: findCol(header, (s) => s.includes('загальний обсяг') || s === 'годин'),
    ects: findCol(header, (s) => s.includes('кредит')),
    auditory: findCol(header, (s) => s.includes('всього аудиторних')),
    lecture: findCol(header, (s) => s.includes('лекці')),
    practical: findCol(header, (s) => s.includes('практичн') || s.includes('проактичн')),
    seminar: findCol(header, (s) => s.includes('семінар')),
    lab: findCol(header, (s) => s.includes('лаборатор')),
    selfStudy: findCol(header, (s) => s.includes('самостійна')),
    other: (() => {
      const c = findCol(header, (s) => s.includes('інші види'))
      return c >= 0 ? c : null
    })(),
    semesterCols,
    headerEndRow: Math.max(semesterMarkerRow, 0),
  }

  // Тіло починається після рядка з номерами колонок (1,2,3…) — він іде під шапкою.
  // Шукаємо перший рядок, де колонка `code`/`name` містить просто «1»/«2».
  for (let r = map.headerEndRow; r < HEADER_SCAN; r++) {
    const a = norm((rows[r] ?? [])[map.code >= 0 ? map.code : 0])
    const b = norm((rows[r] ?? [])[map.name >= 0 ? map.name : 1])
    if (a === '1' && b === '2') {
      map.headerEndRow = r
      break
    }
  }

  return map
}

const SECONDARY_MARKERS = ['профільної середньої освіти', 'профільна середня освіта']
const PROFESSIONAL_MARKERS = [
  'за освітньо-професійною програмою',
  'освітньо-професійн',
]

function isTotalRow(name: string): boolean {
  const l = name.toLowerCase()
  return l.startsWith('всього') || l.startsWith('разом')
}

/** Підсумкові рядки-футери внизу аркуша «План» — не розділи й не компоненти. */
const FOOTER_MARKERS = [
  'тижневе навантаження',
  'кількість навчальних дисциплін',
  'кількість курсових',
  'кількість екзаменів',
  'кількість заліків',
]

function isFooterRow(name: string): boolean {
  const l = name.toLowerCase()
  return FOOTER_MARKERS.some((m) => l.startsWith(m))
}

/** Рядок-заголовок розділу: має текст у name, але без загальних годин і не «Всього». */
function looksLikeSectionHeader(name: string, totalHours: number | null): boolean {
  if (!name) return false
  if (isTotalRow(name)) return false
  return totalHours === null
}

function parseTerms(
  row: string[],
  semesterCols: Map<number, number>,
): ParsedTerm[] {
  const terms: ParsedTerm[] = []
  for (const [semNo, colIdx] of semesterCols) {
    const raw = norm(row[colIdx])
    if (!raw || raw === '*') continue
    // Формат «34/2» (години/на тиждень) або просто «90».
    const [hPart, wPart] = raw.split('/')
    const hours = toNumber(hPart)
    if (hours === null) continue
    terms.push({
      semesterNumber: semNo,
      hours,
      hoursPerWeek: wPart !== undefined ? toNumber(wPart) : null,
    })
  }
  return terms.sort((a, b) => a.semesterNumber - b.semesterNumber)
}

/** Парсить аркуш «План». */
function parsePlanSheet(
  rows: Matrix,
  warnings: string[],
): { semesters: ParsedSemester[]; sections: ParsedSection[] } {
  const cols = detectColumns(rows)

  // Перевірка критичних колонок.
  const required: [string, number][] = [
    ['name', cols.name],
    ['totalHours', cols.totalHours],
    ['ects', cols.ects],
  ]
  for (const [label, idx] of required) {
    if (idx < 0) warnings.push(`Не знайдено колонку «${label}» у шапці аркуша «План».`)
  }
  if (cols.semesterCols.size === 0) {
    warnings.push('Не знайдено семестрових колонок (маркер «семестр тижнів»).')
  }

  // Семестри + тижні: рядок з тижнями — під маркер-рядком (де числа тижнів).
  const semesters: ParsedSemester[] = []
  const weeksRow = rows[cols.headerEndRow - 1] ?? rows[cols.headerEndRow] ?? []
  for (const [semNo, colIdx] of [...cols.semesterCols].sort((a, b) => a[0] - b[0])) {
    const weeks = toNumber(weeksRow[colIdx])
    semesters.push({
      semesterNumber: semNo,
      courseNumber: Math.ceil(semNo / 2),
      weeks,
    })
  }

  const sections: ParsedSection[] = []
  let currentPart: CurriculumPart = 'SECONDARY'
  let currentSection: ParsedSection | null = null
  // Код останнього «справжнього» вибіркового компонента (ВКn) — до нього
  // привʼязуються рядки-заглушки «Дисципліна 2/3» як альтернативи блоку.
  let lastElectiveGroupCode: string | null = null

  const colVal = (row: string[], idx: number): string =>
    idx >= 0 ? norm(row[idx]) : ''

  const isPlaceholderRow = (name: string, row: string[]): boolean =>
    /^дисципліна\s*\d/i.test(name) || colVal(row, cols.totalHours) === '*'

  for (let r = cols.headerEndRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const code = colVal(row, cols.code)
    const name = colVal(row, cols.name)
    const totalHours = cols.totalHours >= 0 ? toNumber(row[cols.totalHours]) : null

    if (!code && !name) continue // порожній рядок

    const joined = lower(code + ' ' + name)

    // Перемикач частини плану.
    if (PROFESSIONAL_MARKERS.some((m) => joined.includes(m))) {
      currentPart = 'PROFESSIONAL'
      continue
    }
    if (SECONDARY_MARKERS.some((m) => joined.includes(m))) {
      currentPart = 'SECONDARY'
      continue
    }

    // Футер-рядки плану (тижневе навантаження, к-сть екзаменів тощо) — ігноруємо.
    if (isFooterRow(name)) continue

    // Підсумок «Всього».
    if (isTotalRow(name) || isTotalRow(code)) {
      const subtotal: ParsedSubtotal = {
        label: name || code,
        totalHours,
        ects: cols.ects >= 0 ? toNumber(row[cols.ects]) : null,
        sourceRow: r + 1,
      }
      if (currentSection) currentSection.subtotal = subtotal
      continue
    }

    const placeholder = isPlaceholderRow(name, row)

    // Заголовок розділу (але НЕ рядок-заглушка альтернативи «Дисципліна N»).
    if (!placeholder && looksLikeSectionHeader(name || code, totalHours)) {
      currentSection = {
        name: name || code,
        part: currentPart,
        components: [],
        subtotal: null,
        sourceRow: r + 1,
      }
      sections.push(currentSection)
      continue
    }

    // Рядок компонента. Гарантуємо наявність секції.
    if (!currentSection) {
      currentSection = {
        name: '(без розділу)',
        part: currentPart,
        components: [],
        subtotal: null,
        sourceRow: r + 1,
      }
      sections.push(currentSection)
    }

    const rawExam = colVal(row, cols.exam)
    const isElective = /^вк/i.test(code)
    const isPlaceholder = placeholder

    // Надійне визначення частини: коди ОК/ВК належать ОПП незалежно від
    // формулювання заголовка-перемикача (воно різниться між роками).
    // Ретроактивно виправляємо й поточний розділ, у якому зʼявився перший ОК/ВК.
    if (/^(ОК|ВК)\s*\d/i.test(code)) {
      currentPart = 'PROFESSIONAL'
      currentSection.part = 'PROFESSIONAL'
    }

    if (isElective) lastElectiveGroupCode = code

    const parsedName = parseComponentName(name)

    const component: ParsedComponent = {
      code: code || null,
      name: parsedName.name,
      displayMarker: parsedName.displayMarker,
      integratedWithCode: parsedName.integratedWithCode,
      isElectivePlaceholder: isPlaceholder,
      isElective: isElective || isPlaceholder,
      electiveGroupCode: isElective ? code : isPlaceholder ? lastElectiveGroupCode : null,
      examSemesters: parseSemesterList(row[cols.exam]),
      creditSemesters: parseSemesterList(row[cols.credit]),
      courseWorkSemesters: parseSemesterList(row[cols.courseWork]),
      rawExam: rawExam && !/^[\d\s,]+$/.test(rawExam) ? rawExam : null,
      totalHours,
      ects: cols.ects >= 0 ? toNumber(row[cols.ects]) : null,
      auditoryHours: cols.auditory >= 0 ? toNumber(row[cols.auditory]) : null,
      lectureHours: cols.lecture >= 0 ? toNumber(row[cols.lecture]) : null,
      practicalHours: cols.practical >= 0 ? toNumber(row[cols.practical]) : null,
      seminarHours: cols.seminar >= 0 ? toNumber(row[cols.seminar]) : null,
      labHours: cols.lab >= 0 ? toNumber(row[cols.lab]) : null,
      selfStudyHours: cols.selfStudy >= 0 ? toNumber(row[cols.selfStudy]) : null,
      otherHours: cols.other !== null ? toNumber(row[cols.other]) : null,
      terms: parseTerms(row, cols.semesterCols),
      sourceRow: r + 1,
    }

    currentSection.components.push(component)
  }

  return { semesters, sections }
}

/** Парсить аркуш «титулка» → зведений бюджет часу. */
function parseTimeBudget(rows: Matrix, warnings: string[]): ParsedTimeBudgetRow[] {
  // Знаходимо заголовок таблиці бюджету («Зведені дані за бюджетом часу»).
  let headerRow = -1
  for (let r = 0; r < rows.length; r++) {
    const joined = lower((rows[r] ?? []).join(' '))
    if (joined.includes('теоретичне навчання') && joined.includes('тижн')) {
      headerRow = r
      break
    }
  }
  if (headerRow < 0) {
    warnings.push('Аркуш «титулка»: не знайдено таблицю бюджету часу.')
    return []
  }

  // Колонки визначаємо за заголовком.
  const head = rows[headerRow] ?? []
  const findIn = (sub: string) => head.findIndex((c) => lower(c).includes(sub))
  const cCourse = findIn('курс')
  const cTheory = findIn('теоретичне')
  const cSession = findIn('екзаменаційна')
  const cPractice = findIn('практичне')
  const cAttest = findIn('атестаці')
  const cHoliday = findIn('канікули')
  const cTotal = findIn('всього тижнів')

  const budget: ParsedTimeBudgetRow[] = []
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const course = norm(row[cCourse])
    if (!course) continue
    const total = cTotal >= 0 ? toNumber(row[cTotal]) : null
    // Зупиняємось, якщо вже немає осмислених даних.
    if (!total && !toNumber(row[cTheory >= 0 ? cTheory : 0])) {
      if (course.toLowerCase() === 'всього') {
        budget.push({
          courseLabel: course,
          theoryWeeks: cTheory >= 0 ? toNumber(row[cTheory]) : null,
          sessionWeeks: cSession >= 0 ? toNumber(row[cSession]) : null,
          practiceWeeks: cPractice >= 0 ? toNumber(row[cPractice]) : null,
          attestationWeeks: cAttest >= 0 ? toNumber(row[cAttest]) : null,
          holidayWeeks: cHoliday >= 0 ? toNumber(row[cHoliday]) : null,
          totalWeeks: total,
        })
      }
      continue
    }
    budget.push({
      courseLabel: course,
      theoryWeeks: cTheory >= 0 ? toNumber(row[cTheory]) : null,
      sessionWeeks: cSession >= 0 ? toNumber(row[cSession]) : null,
      practiceWeeks: cPractice >= 0 ? toNumber(row[cPractice]) : null,
      attestationWeeks: cAttest >= 0 ? toNumber(row[cAttest]) : null,
      holidayWeeks: cHoliday >= 0 ? toNumber(row[cHoliday]) : null,
      totalWeeks: total,
    })
  }
  return budget
}

/** Витягує навчальний рік та спеціальність з назви файлу. */
function parseMeta(fileName: string): { academicYear: string | null; specialtyName: string | null } {
  const year = fileName.match(/(\d{4})\s*[-–]\s*(\d{4})/)
  const spec = fileName.match(/план\s+(.+?)\s+на\s+\d{4}/i)
  return {
    academicYear: year ? `${year[1]}-${year[2]}` : null,
    specialtyName: spec ? norm(spec[1]) : null,
  }
}

/** Головна точка входу: парсить .xls-буфер у структуру ParsedCurriculum. */
export function parseCurriculumWorkbook(
  buffer: Buffer,
  fileName: string,
): ParsedCurriculum {
  const warnings: string[] = []
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const planName = wb.SheetNames.find((n) => lower(n) === 'план') ?? 'План'
  const planSheet = wb.Sheets[planName]
  if (!planSheet) {
    warnings.push('Не знайдено аркуш «План».')
    return {
      meta: { sourceFile: fileName, ...parseMeta(fileName) },
      semesters: [],
      sections: [],
      timeBudget: [],
      warnings,
    }
  }

  const planRows = XLSX.utils.sheet_to_json<string[]>(planSheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as Matrix

  const { semesters, sections } = parsePlanSheet(planRows, warnings)

  const titleName = wb.SheetNames.find((n) => lower(n) === 'титулка')
  let timeBudget: ParsedTimeBudgetRow[] = []
  if (titleName && wb.Sheets[titleName]) {
    const titleRows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[titleName], {
      header: 1,
      raw: false,
      defval: '',
    }) as Matrix
    timeBudget = parseTimeBudget(titleRows, warnings)
  }

  return {
    meta: { sourceFile: fileName, ...parseMeta(fileName) },
    semesters,
    sections,
    timeBudget,
    warnings,
  }
}
