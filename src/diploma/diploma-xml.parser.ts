import { XMLParser } from 'fast-xml-parser'

/**
 * Парсер XML ЄДЕБО (Модуль замовлення документів ODM) — список замовлених дипломів.
 * Кожен <Document> = один диплом студента. Оцінок/ОК у XML немає — лише замовлення.
 */

/** Підмножина полів <Document>, які зберігаємо в Diploma. */
export interface ParsedDiplomaOrder {
  documentTypeName: string | null
  lastNameUk: string
  firstNameUk: string
  lastNameEn: string | null
  firstNameEn: string | null
  birthday: Date | null
  edeboPersonCode: string | null
  personEducationId: number | null
  inn: string | null
  sexName: string | null

  documentSeries: string | null
  documentNumber: string | null
  supplementId: number | null
  graduateDate: Date | null
  issueDate: Date | null

  specialityName: string | null
  specialityNameEn: string | null
  specialtyCode: string | null
  qualificationName: string | null
  studyProgramName: string | null
  studyProgramNameEn: string | null
  studyGroupName: string | null
  courseName: string | null
  accreditationName: string | null
  accreditationNameEn: string | null

  bossFio: string | null
  bossPost: string | null
  bossFioEn: string | null
  bossPostEn: string | null
  universityPrintName: string | null
  universityPrintNameEn: string | null

  paymentTypeName: string | null
  educationFormName: string | null
}

interface RawDocument {
  [key: string]: string | number | boolean | undefined
}

/** "30.06.2026 0:00:00" / "19.11.2007" → Date (UTC, без часу). */
function parseEdeboDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const datePart = value.trim().split(' ')[0]
  const m = datePart?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)))
}

function str(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

function num(value: unknown): number | null {
  const s = str(value)
  if (s === null) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Код спеціальності — перший токен SpecialityName ("122 Комп'ютерні науки" → "122"). */
function parseSpecialtyCode(specialityName: string | null): string | null {
  if (!specialityName) return null
  const first = specialityName.trim().split(/\s+/)[0]
  return first && /^[A-Za-zА-Яа-я]{0,2}\d+$/.test(first) ? first.toUpperCase() : null
}

export function parseDiplomaXml(buffer: Buffer): ParsedDiplomaOrder[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false, // зберігаємо рядки (номери з ведучими нулями: "050987")
    trimValues: true,
  })

  const root = parser.parse(buffer.toString('utf-8')) as {
    Documents?: { Document?: RawDocument | RawDocument[] }
  }

  const docs = root.Documents?.Document
  if (!docs) return []
  const list = Array.isArray(docs) ? docs : [docs]

  return list.map((d): ParsedDiplomaOrder => {
    const specialityName = str(d.SpecialityName)
    return {
      documentTypeName: str(d.DocumentTypeName),
      lastNameUk: str(d.LastName) ?? '',
      firstNameUk: str(d.FirstName) ?? '',
      lastNameEn: str(d.LastNameEn),
      firstNameEn: str(d.FirstNameEn),
      birthday: parseEdeboDate(d.Birthday),
      edeboPersonCode: str(d.PersonCode),
      personEducationId: num(d.PersonEducationId),
      inn: str(d.INN),
      sexName: str(d.SexName),

      documentSeries: str(d.DocumentSeries),
      documentNumber: str(d.DocumentNumber),
      supplementId: num(d.SupplementId),
      graduateDate: parseEdeboDate(d.GraduateDate),
      issueDate: parseEdeboDate(d.IssueDate),

      specialityName,
      specialityNameEn: str(d.SpecialityNameEn),
      specialtyCode: parseSpecialtyCode(specialityName),
      qualificationName: str(d.QualificationName),
      studyProgramName: str(d.StudyProgramName),
      studyProgramNameEn: str(d.StudyProgramNameEn),
      studyGroupName: str(d.StudyGroupName),
      courseName: str(d.CourseName),
      accreditationName: str(d.AccreditationInstitutionName),
      accreditationNameEn: str(d.AccreditationInstitutionNameEn),

      bossFio: str(d.BossFIO),
      bossPost: str(d.BossPost),
      bossFioEn: str(d.BossFIOEn),
      bossPostEn: str(d.BossPostEn),
      universityPrintName: str(d.UniversityPrintName),
      universityPrintNameEn: str(d.UniversityPrintNameEn),

      paymentTypeName: str(d.PaymentTypeName),
      educationFormName: str(d.EducationFormName),
    }
  })
}
