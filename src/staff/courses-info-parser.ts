/**
 * Парсер поля Teacher.coursesInfo, що містить записи підвищення кваліфікації
 * у вільному форматі з ЄДЕБО.
 *
 * Два типових формати (можуть мішатись у одному рядку):
 *
 * A) CSV-подібний (чіткі коми):
 *    "НУХТ ІПО, свідоцтво, 79/1861, 19.04.2018-22.05.2018, Назва курсу, 22.05.2018, 72 год."
 *    "CISCO, сертифікат, 23.02.2022-23.02.2022, Назва курсу, 23.02.2022, не зазначено"
 *
 * B) Довільний текст:
 *    "ГО «Prometheus» дистанційно Курс «Медіаграмотність» - 60 годин 08.08.2020 року"
 *    "ТВО «Всеосвіта», сертифікат IG17064 10.07.2020 «Медійна грамотність» 2год"
 */

export interface ParsedUpgrade {
  courseName: string
  organizationName: string | null
  startDate: Date
  endDate: Date
  hours: number
  certificateNumber: string | null
  rawText: string
}

// DD.MM.YYYY
const DATE_RE = /\b(\d{2})\.(\d{2})\.(\d{4})\b/g

// DD.MM.YYYY-DD.MM.YYYY або DD.MM.YYYY – DD.MM.YYYY
const DATE_RANGE_RE = /(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/

// X год або X академічних год або X акад.год
const HOURS_RE = /(\d+(?:[.,]\d+)?)\s*(?:акад\.?\s*)?год(?:ин)?(?:\b|\.)/i

// Типи документів для CSV-формату
const DOC_TYPES = ['свідоцтво', 'сертифікат', 'диплом', 'посвідчення', 'довідка']

function parseDate(str: string): Date | null {
  const m = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  const d = new Date(+m[3], +m[2] - 1, +m[1])
  return isNaN(d.getTime()) ? null : d
}

function extractHours(text: string): number | null {
  const m = text.match(HOURS_RE)
  if (!m) return null
  const val = parseFloat(m[1].replace(',', '.'))
  return isNaN(val) ? null : Math.round(val)
}

function extractFirstDate(text: string): Date | null {
  const matches = [...text.matchAll(DATE_RE)]
  for (const m of matches) {
    const d = parseDate(`${m[1]}.${m[2]}.${m[3]}`)
    if (d) return d
  }
  return null
}

function extractAllDates(text: string): Date[] {
  return [...text.matchAll(DATE_RE)]
    .map(m => parseDate(`${m[1]}.${m[2]}.${m[3]}`))
    .filter((d): d is Date => d !== null)
}

/**
 * Спроба розпарсити CSV-подібний запис за відомою схемою:
 * Org, тип, [certNum,] dateRange, courseName, endDate, Xгод
 */
function tryParseCsv(fragment: string): ParsedUpgrade | null {
  const parts = fragment.split(',').map(p => p.trim())
  if (parts.length < 4) return null

  // Знаходимо індекс типу документа
  const docIdx = parts.findIndex(p => DOC_TYPES.some(d => p.toLowerCase().startsWith(d)))
  if (docIdx < 0 || docIdx > 2) return null // org повинна бути перед doc type

  const orgName = parts.slice(0, docIdx).join(', ').trim()
  if (!orgName) return null

  let offset = docIdx + 1 // після типу документа

  // Опціональний номер сертифіката (не дата і не "не зазначено")
  let certNumber: string | null = null
  const afterDoc = parts[offset] ?? ''
  const isDateRange = DATE_RANGE_RE.test(afterDoc)
  const isSingleDate = /^\d{2}\.\d{2}\.\d{4}$/.test(afterDoc.trim())
  const isUnspecified = /не зазначено/i.test(afterDoc)

  if (!isDateRange && !isSingleDate && !isUnspecified) {
    // може бути номер сертифіката
    const potentialCert = afterDoc.replace(/^(свідоцтво|сертифікат|диплом)\s*/i, '').trim()
    if (potentialCert && potentialCert.length < 60) {
      certNumber = potentialCert || null
      offset++
    }
  }

  // Дата або діапазон дат
  const dateField = parts[offset] ?? ''
  const rangeMatch = dateField.match(DATE_RANGE_RE)
  let startDate: Date | null = null
  let endDate: Date | null = null

  if (rangeMatch) {
    startDate = parseDate(rangeMatch[1])
    endDate = parseDate(rangeMatch[2])
    offset++
  } else if (isSingleDate) {
    const d = parseDate(dateField.trim())
    startDate = d
    endDate = d
    offset++
  }

  if (!startDate || !endDate) return null

  // Назва курсу
  const remainingParts = parts.slice(offset)
  if (remainingParts.length === 0) return null

  // Годинник: шукаємо перше поле з "год"
  const hoursIdx = remainingParts.findIndex(p => HOURS_RE.test(p))
  const courseNameParts = hoursIdx >= 0 ? remainingParts.slice(0, hoursIdx) : remainingParts.slice(0, -1)

  // Пропускаємо поле з датою видачі (якщо є між назвою та годинами)
  const coursePartsFiltered = courseNameParts.filter(p => !parseDate(p.trim()))
  const courseName = coursePartsFiltered.join(', ').replace(/[«»]/g, '').trim()
  if (!courseName) return null

  const hoursText = hoursIdx >= 0 ? remainingParts[hoursIdx] : remainingParts[remainingParts.length - 1]
  const hours = extractHours(hoursText)
  if (!hours) return null

  return {
    courseName,
    organizationName: orgName,
    startDate,
    endDate,
    hours,
    certificateNumber: certNumber,
    rawText: fragment,
  }
}

/**
 * Спроба розпарсити вільний текстовий запис через регулярні вирази.
 */
function tryParseFreeText(fragment: string): ParsedUpgrade | null {
  const hours = extractHours(fragment)
  if (!hours) return null

  const dates = extractAllDates(fragment)
  if (dates.length === 0) return null

  // Дата закінчення = остання дата у фрагменті
  const endDate = dates[dates.length - 1]
  const startDate = dates.length > 1 ? dates[0] : endDate

  // Назва курсу: текст між «» або після «Курс» або після тире
  let courseName = ''
  const angledMatch = fragment.match(/[«"](.*?)[»"]/)
  if (angledMatch) {
    courseName = angledMatch[1].trim()
  } else {
    // Беремо перше речення до першої дати
    const beforeDate = fragment.split(/\d{2}\.\d{2}\.\d{4}/)[0].trim()
    courseName = beforeDate.replace(/^[\w\s«»"]+,\s*/, '').trim()
  }

  if (!courseName || courseName.length < 3) return null

  // Організація: перше слово/фраза до коми або першого ключового слова
  const orgMatch = fragment.match(/^([^,«]+?)(?:\s*,|\s+(?:сертифікат|свідоцтво|диплом|дистанційно|онлайн|курс))/i)
  const orgName = orgMatch ? orgMatch[1].trim() : null

  // Номер сертифіката: послідовність букв+цифр що не є датою
  const certMatch = fragment.match(/\b([A-ZА-ЯІЇЄ]{1,10}\d{5,}|\d{4,}\/\d+)\b/i)
  const certNumber = certMatch ? certMatch[1] : null

  return {
    courseName,
    organizationName: orgName,
    startDate,
    endDate,
    hours,
    certificateNumber: certNumber,
    rawText: fragment,
  }
}

/**
 * Розбиває суцільний текст `coursesInfo` на окремі фрагменти.
 *
 * Роздільник між записами визначається евристично:
 * - Якщо попередній фрагмент закінчується на "X год..." / "X кредит..." — наступний запис починається
 * - Або зустрічається великолітерне слово після дати (початок нової організації)
 *
 * Більш структурований підхід: шукаємо шаблон "дата → X год" і ділимо по ньому.
 */
function splitIntoFragments(text: string): string[] {
  // Замінюємо всі \n, \r на пробіл
  const normalized = text.replace(/\s+/g, ' ').trim()

  // Знаходимо позиції після "X год..." де може починатись новий запис
  const splitPattern =
    /(\d+\s*(?:акад\.?\s*)?год(?:ин)?[^.]*?(?:ЄКТС|ECTS|кредит[^.]*?)?\.?)\s*(?=[А-ЯІЇЄA-Z])/g

  const boundaries: number[] = [0]
  let match: RegExpExecArray | null
  while ((match = splitPattern.exec(normalized)) !== null) {
    const pos = match.index + match[0].length
    if (pos > 0 && pos < normalized.length - 10) {
      boundaries.push(pos)
    }
  }
  boundaries.push(normalized.length)

  const fragments: string[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const frag = normalized.slice(boundaries[i], boundaries[i + 1]).trim()
    if (frag.length > 10) fragments.push(frag)
  }

  return fragments.length > 1 ? fragments : [normalized]
}

/**
 * Головна функція парсингу.
 * Повертає масив розпарсованих записів (best-effort).
 */
export function parseCoursesInfo(coursesInfo: string | null): ParsedUpgrade[] {
  if (!coursesInfo || !coursesInfo.trim()) return []

  const fragments = splitIntoFragments(coursesInfo)
  const results: ParsedUpgrade[] = []

  for (const fragment of fragments) {
    const parsed = tryParseCsv(fragment) ?? tryParseFreeText(fragment)
    if (parsed) results.push(parsed)
  }

  return results
}
