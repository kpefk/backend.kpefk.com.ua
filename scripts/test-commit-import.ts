/**
 * Інтеграційний тест commit-імпорту проти dev-БД.
 * Створює тимчасову ОПП, імпортує реальний .xls, перевіряє інтеграцію
 * (канонічний компонент + проєкція), друкує звіт і чистить БД.
 *
 * Запуск: npx ts-node --transpile-only scripts/test-commit-import.ts "<file.xls>"
 */
import * as fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'

import { parseCurriculumWorkbook } from '../src/curriculum/import/curriculum-xls.parser'
import { CurriculumImportService } from '../src/curriculum/import/curriculum-import.service'

dotenv.config()

async function main() {
  const file = process.argv[2]
  const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URI })
  const prisma = new PrismaClient({ adapter })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new CurriculumImportService(prisma as any)

  try {
    // Тимчасова спеціальність + ОПП
    const spec = await prisma.specialty.create({
      data: { code: 'TEST-F3', name: 'Тест Комп’ютерні науки', isActive: true },
    })
    const program = await prisma.educationalProgram.create({
      data: { specialtyId: spec.id, name: 'Тест ОПП', qualificationName: 'ФМБ' },
    })

    const parsed = parseCurriculumWorkbook(fs.readFileSync(file), 'test.xls')

    const result = await service.commit({
      programId: program.id,
      educationForm: 'FULL_TIME',
      admissionBasis: 'AFTER_9TH_GRADE',
      entryYear: 2025,
      studyDurationMonths: 46,
      parsed,
    })
    console.log('COMMIT stats:', JSON.stringify(result.stats))

    // Перевірки
    const projections = await prisma.curriculumComponentDisplayInSection.findMany({
      include: { component: { select: { code: true, name: true } }, section: { select: { name: true } } },
    })
    console.log('\nПроєкції (канонічний → розділ ЗСО):', projections.length)
    projections.forEach((p) =>
      console.log(`  ${p.displayMarker} ${p.component.code} «${p.component.name}» → «${p.section.name}» | ${p.displayNote}`),
    )

    // Канонічні інтегровані: ОК3/4/5/8/9 мають терміни (розклад із ЗСО)
    const integrated = await prisma.curriculumComponent.findMany({
      where: { code: { in: ['ОК3', 'ОК4', 'ОК5', 'ОК8', 'ОК9'] } },
      include: { terms: true, section: { select: { name: true, sectionType: true } } },
    })
    console.log('\nКанонічні інтегровані компоненти:')
    integrated.forEach((c) =>
      console.log(
        `  ${c.code} «${c.name}» розділ=${c.section.sectionType} ЄКТС=${c.totalEcts} год=${c.totalHours} термінів=${c.terms.length} (${c.terms.map((t) => 'с' + t.semesterNumber + ':' + t.hours).join(' ')})`,
      ),
    )

    // Перевірка: чи немає дублів ЗСО (Громадянська освіта має існувати 1 раз)
    const grom = await prisma.curriculumComponent.findMany({
      where: { name: { contains: 'Громадянська освіта' } },
      select: { code: true, name: true, section: { select: { sectionType: true } } },
    })
    console.log('\n«Громадянська освіта» у БД (має бути 1 канонічний):', grom.length)
    grom.forEach((g) => console.log(`  ${g.code} — розділ ${g.section.sectionType}`))
  } finally {
    // Чистимо БД назад у порожній стан
    const order = [
      'teacherLoadLessonAssignment','teacherLoadSubjectAssignment','electiveRegistration',
      'electiveComponent','electiveOffering','electiveBlockSeason','electiveSeason',
      'studentIndividualPlanItem','studentIndividualPlan','studentElectiveSelection',
      'groupElectiveSelection','groupWorkingCurriculumAssignment','workingCurriculumComponentTerm',
      'workingCurriculum','groupCurriculumAssignment','academicCalendarEntry','timeBudgetEntry',
      'curriculumComponentDisplayInSection','curriculumComponentTerm','curriculumComponent',
      'electiveBlock','curriculumSection','curriculumVersion','curriculum','educationalProgram','specialty',
    ]
    await prisma.$transaction(async (tx) => {
      for (const m of order) await (tx as any)[m].deleteMany({})
    })
    const sp = await prisma.specialty.count()
    const cu = await prisma.curriculum.count()
    console.log(`\nCLEANUP → specialties:${sp} curricula:${cu}`)
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('ERR', e)
  process.exit(1)
})
