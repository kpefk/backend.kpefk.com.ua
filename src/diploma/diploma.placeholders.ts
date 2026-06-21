import PizZip from 'pizzip'

import type { TemplateFileKind } from './diploma-template.service'

/**
 * Обов'язкові плейсхолдери для .docx-шаблонів диплома та додатка.
 * Використовуються для валідації при завантаженні файлу шаблону.
 */

/** Диплом — мапиться 1:1 на дані ЄДЕБО (ПІБ, документ, спеціальність, підпис, дата). */
export const DIPLOMA_REQUIRED_PLACEHOLDERS = [
  '{lastNameUk}',
  '{firstNameUk}',
  '{documentSeries}',
  '{documentNumber}',
  '{graduateYear}',
  '{specialityNameUk}',
  '{issueDateUk}',
  '{bossFio}',
] as const

/** Додаток (diploma supplement) — двомовний, з циклом зведеної відомості §4.3. */
export const ADDENDUM_REQUIRED_PLACEHOLDERS = [
  // Особа
  '{lastNameUk}',
  '{firstNameUk}',
  '{lastNameEn}',
  '{firstNameEn}',
  // Документ
  '{documentSeries}',
  '{documentNumber}',
  '{supplementId}',
  // §6.2.2 — документ про освіту, підстава для вступу
  '{entryDocumentUk}',
  '{entryDocumentEn}',
  // §7.1 — період навчання
  '{studyPeriod}',
  // Цикл зведеної відомості §4.3
  '{#components}',
  '{code}',
  '{nameUk}',
  '{nameEn}',
  '{ects}',
  '{gradeUk}',
  '{gradeEn}',
  '{/components}',
  '{totalEcts}',
] as const

export function requiredPlaceholders(kind: TemplateFileKind): readonly string[] {
  return kind === 'diploma'
    ? DIPLOMA_REQUIRED_PLACEHOLDERS
    : ADDENDUM_REQUIRED_PLACEHOLDERS
}

/**
 * Зчитує текст із .docx (word/document.xml), знімаючи XML-теги, щоб плейсхолдери,
 * розбиті на кілька `<w:r>` runs, склеювались у суцільний рядок для пошуку.
 */
export function extractDocxText(buffer: Buffer): string {
  const zip = new PizZip(buffer)
  const file = zip.file('word/document.xml')
  if (!file) return ''
  const xml = file.asText()
  return xml.replace(/<[^>]+>/g, '')
}

/** Повертає список відсутніх обов'язкових плейсхолдерів (порожній = все гаразд). */
export function findMissingPlaceholders(
  buffer: Buffer,
  kind: TemplateFileKind,
): string[] {
  const text = extractDocxText(buffer)
  return requiredPlaceholders(kind).filter((p) => !text.includes(p))
}
