/**
 * Dry-run: парсить .xls навчальні плани й виводить структуру БЕЗ запису в БД.
 *
 * Запуск:
 *   npx ts-node scripts/dry-run-curriculum-import.ts "<шлях1.xls>" "<шлях2.xls>"
 *
 * Для кожного файлу друкує стислий звіт у консоль і зберігає повний JSON поруч
 * у ./tmp/<імʼя>.parsed.json для детальної звірки.
 */
import * as fs from 'fs'
import * as path from 'path'

import { parseCurriculumWorkbook } from '../src/curriculum/import/curriculum-xls.parser'
import { ParsedCurriculum } from '../src/curriculum/import/curriculum-import.types'

function summarize(p: ParsedCurriculum): void {
  console.log('\n' + '='.repeat(70))
  console.log('ФАЙЛ:', p.meta.sourceFile)
  console.log('Рік:', p.meta.academicYear, '| Спеціальність:', p.meta.specialtyName)
  console.log(
    'Семестри:',
    p.semesters.map((s) => `${s.semesterNumber}(${s.weeks ?? '?'}т)`).join(' '),
  )
  console.log('Розділів:', p.sections.length)

  let totalComponents = 0
  let totalTerms = 0
  for (const sec of p.sections) {
    totalComponents += sec.components.length
    const sub = sec.subtotal
    console.log(
      `\n  ▸ [${sec.part}] ${sec.name}  (компонентів: ${sec.components.length}` +
        (sub ? `, Всього: ${sub.totalHours ?? '—'} год` : '') +
        ')',
    )
    for (const c of sec.components) {
      totalTerms += c.terms.length
      const termsStr = c.terms
        .map((t) => `с${t.semesterNumber}:${t.hours}${t.hoursPerWeek ? '/' + t.hoursPerWeek : ''}`)
        .join(' ')
      const flags = [
        c.isElective ? 'ВК' : '',
        c.isElectivePlaceholder ? 'заглушка' : '',
        c.examSemesters.length ? `екз:${c.examSemesters.join(',')}` : '',
        c.creditSemesters.length ? `зал:${c.creditSemesters.join(',')}` : '',
        c.courseWorkSemesters.length ? `кр:${c.courseWorkSemesters.join(',')}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      console.log(
        `      ${(c.code ?? '·').padEnd(6)} ${c.name.slice(0, 48).padEnd(48)} ` +
          `${String(c.totalHours ?? '—').padStart(4)}год ${String(c.ects ?? '—').padStart(5)}кр  ` +
          `${termsStr}  ${flags}`,
      )
    }
  }

  console.log('\n  ── Бюджет часу (титулка) ──')
  for (const b of p.timeBudget) {
    console.log(
      `      ${b.courseLabel.padEnd(7)} теор:${b.theoryWeeks ?? '—'} сесія:${b.sessionWeeks ?? '—'} ` +
        `практ:${b.practiceWeeks ?? '—'} атест:${b.attestationWeeks ?? '—'} канік:${b.holidayWeeks ?? '—'} ` +
        `всього:${b.totalWeeks ?? '—'}`,
    )
  }

  console.log(
    `\n  ПІДСУМОК: розділів=${p.sections.length}, компонентів=${totalComponents}, термінів=${totalTerms}`,
  )
  if (p.warnings.length) {
    console.log('  ⚠ ПОПЕРЕДЖЕННЯ:')
    p.warnings.forEach((w) => console.log('     - ' + w))
  } else {
    console.log('  ✓ Попереджень немає')
  }
}

function main(): void {
  const files = process.argv.slice(2)
  if (files.length === 0) {
    console.error('Вкажіть шлях(и) до .xls файлів.')
    process.exit(1)
  }

  const outDir = path.join(__dirname, '..', 'tmp')
  fs.mkdirSync(outDir, { recursive: true })

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error('Файл не знайдено:', file)
      continue
    }
    const buffer = fs.readFileSync(file)
    const parsed = parseCurriculumWorkbook(buffer, path.basename(file))
    summarize(parsed)

    const outName = path.basename(file).replace(/\.[^.]+$/, '') + '.parsed.json'
    fs.writeFileSync(path.join(outDir, outName), JSON.stringify(parsed, null, 2), 'utf8')
    console.log('  → Повний JSON:', path.join('tmp', outName))
  }
}

main()
