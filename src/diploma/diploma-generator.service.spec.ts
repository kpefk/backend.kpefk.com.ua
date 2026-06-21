import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

import { Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { DiplomaGeneratorService, type DiplomaRow } from './diploma-generator.service'

/**
 * Перевіряє, що вся інформація заповнюється у дипломі та додатку:
 *  1) кожен плейсхолдер шаблону отримує значення з buildData (немає неперекритих тегів);
 *  2) у згенерованому .docx немає залишків `{...}`;
 *  3) ключові значення (ПІБ, № диплома, період навчання, документ про освіту,
 *     зведена відомість тощо) реально присутні у виводі.
 */

const FIX = join(__dirname, '__fixtures__')
const diplomaDocx = readFileSync(join(FIX, 'diploma_122.docx'))
const addendumDocx = readFileSync(join(FIX, 'addendum_122.docx'))

function fullRow(): DiplomaRow {
  const now = new Date()
  const template: DiplomaRow['template'] = {
    id: 't1',
    name: '122 Комп’ютерні науки (дипломний проєкт)',
    specialtyCode: '122',
    specialtyName: "Комп'ютерні науки",
    variant: 'DIPLOMA_PROJECT',
    diplomaDocx,
    addendumDocx,
    qualificationNameUk: 'Фаховий молодший бакалавр ',
    qualificationNameUk2: "з комп'ютерних наук",
    qualificationNameEn: 'Professional Junior Bachelor in ',
    qualificationNameEn2: 'Computer sciences',
    degreeNameUk: 'Фаховий молодший бакалавр',
    degreeNameEn: 'Professional Junior Bachelor',
    studyPeriod: '01/09/2022-30/06/2026',
    accrCertNumber: '001501',
    accrCertSeries: 'ДС',
    accrCertDate: '09/06/2019',
    accrCertEndDate: '2027-06-30',
    accrProtocolNumber: '136',
    accrInstitutionName: 'Державна служба якості освіти України',
    accrInstitutionNameEn: 'The State Service of Education Quality of Ukraine',
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  const mkComp = (
    i: number,
    code: string,
    nameUk: string,
    nameEn: string,
    ects: number,
    type: Prisma.DiplomaComponentCreateInput['type'],
    grade: Prisma.DiplomaComponentCreateInput['grade'],
    controlForm: Prisma.DiplomaComponentCreateInput['controlForm'] = 'GRADED_CREDIT',
  ): DiplomaRow['components'][number] => ({
    id: `c${i}`,
    diplomaId: 'd1',
    code,
    nameUk,
    nameEn,
    ects: new Prisma.Decimal(ects),
    type,
    controlForm: controlForm ?? null,
    orderIndex: i,
    grade: grade ?? null,
  })

  return {
    id: 'd1',
    batchId: 'b1',
    templateId: 't1',
    lastNameUk: 'Шевченко',
    firstNameUk: 'Тарас',
    lastNameEn: 'Shevchenko',
    firstNameEn: 'Taras',
    birthday: new Date(Date.UTC(2007, 5, 13)),
    edeboPersonCode: 'deadbeef-1234-5678-99aa-edeb00edeb00',
    personId: 10138693,
    personEducationId: 1960044,
    inn: '1234567890',
    sexName: 'Чоловіча',
    documentSeries: 'X26',
    documentNumber: '051136',
    supplementId: 1960044,
    graduateDate: new Date(Date.UTC(2026, 5, 30)),
    issueDate: new Date(Date.UTC(2026, 5, 30)),
    specialityName: "Комп'ютерні науки",
    specialityNameEn: 'Computer sciences',
    qualificationName: "Фаховий молодший бакалавр з комп'ютерних наук",
    studyProgramName: "Комп'ютерні науки",
    studyProgramNameEn: 'Computer sciences',
    studyGroupName: 'КН-41',
    courseName: '4 курс',
    accreditationName: 'Державна служба якості освіти України',
    accreditationNameEn: 'The State Service of Education Quality of Ukraine',
    bossFio: 'Ірина Вахович',
    bossPost: 'Ректор',
    bossFioEn: 'Iryna Vakhovych',
    bossPostEn: 'Rector',
    universityPrintName: 'ВСП «Ковельський ПЕФК ЛНТУ»',
    universityPrintNameEn: 'SSU «Kovel IEAC LNTU»',
    paymentTypeName: 'За кошти фізичних осіб',
    educationFormName: 'Очна (денна)',
    entryDocumentUk:
      'Свідоцтво про здобуття базової середньої освіти BC 52891556, ЛІЦЕЙ №11 м. КОВЕЛЯ, 17/06/2022',
    entryDocumentEn:
      'Certificate of basic secondary education VS 52891556, KOVEL LYCEUM No. 11, 17/06/2022',
    entryYearEnd: 2022,
    studyDateBegin: new Date(Date.UTC(2022, 8, 1)),
    studyDateEnd: new Date(Date.UTC(2026, 5, 30)),
    qualificationWorkTitleUk: 'Розробка АРМ продавця-консультанта',
    qualificationWorkTitleEn: 'Development of the sales consultant ARM',
    isHonors: false,
    status: 'READY',
    createdAt: now,
    updatedAt: now,
    template,
    components: [
      mkComp(0, 'ОК 1', 'Історія державності і культура', 'History of statehood and culture', 3, 'REGULAR', 'SATISFACTORY', 'EXAM'),
      mkComp(1, 'ОК 2', 'Алгоритмізація та програмування', 'Algorithmization and programming', 8, 'REGULAR', 'EXCELLENT', 'EXAM'),
      mkComp(2, 'ВК 1', 'Вступ до кібербезпеки', 'Introduction to cybersecurity', 5, 'ELECTIVE', 'GOOD', 'GRADED_CREDIT'),
      mkComp(3, 'ОК 8', 'Фізичне виховання', 'Physical education', 6.5, 'REGULAR', 'PASSED', 'CREDIT'),
      mkComp(4, 'ОК 25', 'Переддипломна практика', 'Pre-diploma practice', 4.5, 'PRACTICE', 'GOOD', 'GRADED_CREDIT'),
      mkComp(5, 'ОК 26', 'Кваліфікаційна робота (дипломний проєкт)', 'Qualification work (diploma project)', 9, 'ATTESTATION', 'EXCELLENT', 'EXAM'),
    ],
  }
}

function makeService(row: DiplomaRow): DiplomaGeneratorService {
  const prisma = {
    diploma: { findUnique: jest.fn().mockResolvedValue(row) },
  } as unknown as PrismaService
  return new DiplomaGeneratorService(prisma)
}

/** Дістає чистий текст з .docx (word/document.xml без XML-тегів, з декодованими сутностями). */
function docxText(buffer: Buffer): string {
  const xml = new PizZip(buffer).file('word/document.xml')!.asText()
  return decodeEntities(xml.replace(/<[^>]+>/g, ''))
}

function decodeEntities(s: string): string {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#x2018;/g, "'")
    .replace(/&#x201C;/g, '"')
    .replace(/&#x201D;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** Рендерить шаблон і повертає теги, для яких buildData НЕ дав значення. */
function unfilledTags(bytes: Uint8Array, data: Record<string, unknown>): string[] {
  const missing: string[] = []
  const doc = new Docxtemplater(new PizZip(Buffer.from(bytes)), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter(part) {
      const tag = (part as { value?: string }).value
      if (tag) missing.push(tag)
      return ''
    },
  })
  doc.render(data)
  return [...new Set(missing)]
}

describe('DiplomaGeneratorService — повнота заповнення', () => {
  const row = fullRow()
  const service = makeService(row)
  const data = service.buildData(row)

  describe('Диплом', () => {
    it('кожен плейсхолдер шаблону отримує значення (немає неперекритих тегів)', () => {
      expect(unfilledTags(diplomaDocx, data)).toEqual([])
    })

    it('у згенерованому .docx немає залишків {...}', async () => {
      const { buffer, filename } = await service.generateOne('d1', 'diploma')
      const text = docxText(buffer)
      expect(text).not.toMatch(/\{[#/^]?[A-Za-z]/)
      expect(filename).toBe('Диплом_Шевченко_Тарас.docx')
    })

    it('містить ключові значення (ПІБ, серія/№, спеціальність, підпис, дата)', async () => {
      const { buffer } = await service.generateOne('d1', 'diploma')
      const text = docxText(buffer)
      for (const v of [
        'Шевченко', 'Тарас', 'Shevchenko', 'Taras',
        'X26', '051136', '2026',
        "Комп'ютерні науки", 'Computer sciences', '122',
        'Ірина Вахович', 'Ректор', 'Rector',
      ]) {
        expect(text).toContain(v)
      }
    })
  })

  describe('Додаток', () => {
    it('кожен плейсхолдер шаблону отримує значення (немає неперекритих тегів)', () => {
      expect(unfilledTags(addendumDocx, data)).toEqual([])
    })

    it('у згенерованому .docx немає залишків {...}', async () => {
      const { buffer } = await service.generateOne('d1', 'addendum')
      expect(docxText(buffer)).not.toMatch(/\{[#/^]?[A-Za-z]/)
    })

    it('містить персональні дані, §6.2.2, §7.1 та зведену відомість', async () => {
      const { buffer } = await service.generateOne('d1', 'addendum')
      const text = docxText(buffer)
      for (const v of [
        'Шевченко', 'Тарас', '13/06/2007', // ПІБ + дата народження §1.3
        '10138693',                         // §1.4 код картки фіз. особи
        'X26', '051136', '1960044',         // серія/№ + реєстр. № додатка
        '01/09/2022-30/06/2026',            // §6.1.2 / §7.1 період навчання
        'Свідоцтво про здобуття базової середньої освіти', // §6.2.2 укр.
        'Certificate of basic secondary education',        // §6.2.2 англ.
        'ДС', '001501', '136', '09/06/2019',               // §6.2.3 акредитація
        'Ірина Вахович', 'Iryna Vakhovych',                // §7.3.1 підпис
        '36,0',                                            // разом кредитів (сума ОК у фікстурі)
      ]) {
        expect(text).toContain(v)
      }
    })

    it('зведена відомість §4.3 заповнюється рядками ОК з оцінками', async () => {
      const { buffer } = await service.generateOne('d1', 'addendum')
      const text = docxText(buffer)
      // коди ОК
      expect(text).toContain('ОК 1')
      expect(text).toContain('ВК 1')
      expect(text).toContain('ОК 26')
      // назви + оцінки кожного типу
      expect(text).toContain('Алгоритмізація та програмування')
      expect(text).toContain('Відмінно')
      expect(text).toContain('Excellent')
      expect(text).toContain('Задовільно')
      expect(text).toContain('Зараховано') // PASSED (фізвиховання)
      // кредити окремих ОК
      expect(text).toContain('8,0')
      expect(text).toContain('4,5')
    })
  })

  it('сумарні кредити рахуються з компонентів (3+8+5+6.5+4.5+9 = 36,0)', async () => {
    const small = makeService({ ...row, components: row.components })
    const { buffer } = await small.generateOne('d1', 'addendum')
    // загальна сума у buildData
    const d = small.buildData(row) as { totalEcts: string }
    expect(d.totalEcts).toBe('36,0')
    expect(buffer.length).toBeGreaterThan(1000)
  })
})
