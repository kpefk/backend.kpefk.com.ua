import { Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { DiplomaService } from './diploma.service'

/**
 * Перевіряє, що зведена відомість партії розділяється НА ОКРЕМІ ВІДОМОСТІ ПО ГРУПАХ:
 * кожна група має власний набір ОК (стовпці) і власних студентів (рядки),
 * а форма контролю (шкала оцінювання) доходить до стовпців.
 * Дані змодельовані за наданими фікстурами (групи 359 «071 Облік» і 446 «274 Автотранспорт»).
 */

type Comp = {
  id: string
  code: string | null
  nameUk: string
  nameEn: string | null
  ects: Prisma.Decimal | null
  type: 'REGULAR' | 'ELECTIVE' | 'COURSE_WORK' | 'PRACTICE' | 'ATTESTATION'
  controlForm: 'EXAM' | 'CREDIT' | 'GRADED_CREDIT' | null
  orderIndex: number
  grade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'PASSED' | null
}

const comp = (
  i: number,
  code: string,
  nameUk: string,
  controlForm: Comp['controlForm'],
  grade: Comp['grade'] = null,
): Comp => ({
  id: `${code}-${i}`,
  code,
  nameUk,
  nameEn: null,
  ects: new Prisma.Decimal(3),
  type: 'REGULAR',
  controlForm,
  orderIndex: i,
  grade,
})

// Група 359 — 071 Облік і оподаткування
const G359 = [
  comp(0, 'ОК 1', 'Історія державності і культура', 'EXAM', 'GOOD'),
  comp(1, 'ОК 2', 'Бухгалтерський облік (загальна теорія)', 'EXAM', 'EXCELLENT'),
  comp(2, 'ОК 8', 'Фізичне виховання', 'CREDIT', 'PASSED'),
]
// Група 446 — 274 Автомобільний транспорт (інший набір ОК)
const G446 = [
  comp(0, 'ОК 1', 'Автомобілі та їх конструкція', 'EXAM', 'SATISFACTORY'),
  comp(1, 'ОК 2', 'Електрообладнання автомобілів', 'EXAM', 'GOOD'),
  comp(2, 'ЄДКІ', 'Єдиний державний кваліфікаційний іспит', 'EXAM', null),
]

function diploma(id: string, last: string, group: string, spec: string, comps: Comp[]) {
  return {
    id,
    lastNameUk: last,
    firstNameUk: 'Тест',
    isHonors: false,
    status: 'READY' as const,
    studyGroupName: group,
    specialityName: spec,
    templateId: `tpl-${group}`,
    components: comps.map((c) => ({ ...c, id: `${id}-${c.code}` })),
  }
}

const DIPLOMAS = [
  // навмисно перемішаний порядок груп на вході — сервіс має згрупувати
  diploma('d3', 'Анісімов', '446', '274 Автомобільний транспорт', G446),
  diploma('d1', 'Абрамчук', '359', '071 Облік і оподаткування', G359),
  diploma('d4', 'Бенесько', '446', '274 Автомобільний транспорт', G446),
  diploma('d2', 'Гецун', '359', '071 Облік і оподаткування', G359),
]

function makeService(): DiplomaService {
  const prisma = {
    diploma: { findMany: jest.fn().mockResolvedValue(DIPLOMAS) },
  } as unknown as PrismaService
  return new DiplomaService(prisma)
}

describe('DiplomaService.getGradeSheet — розділення по групах', () => {
  it('повертає окрему відомість на кожну групу, відсортовану за назвою', async () => {
    const { groups } = await makeService().getGradeSheet('batch-1')
    expect(groups.map((g) => g.groupName)).toEqual(['359', '446'])
  })

  it('кожна група має ВЛАСНИЙ набір ОК (стовпці не перемішуються)', async () => {
    const { groups } = await makeService().getGradeSheet('batch-1')
    const g359 = groups.find((g) => g.groupName === '359')!
    const g446 = groups.find((g) => g.groupName === '446')!

    expect(g359.columns.map((c) => c.nameUk)).toEqual([
      'Історія державності і культура',
      'Бухгалтерський облік (загальна теорія)',
      'Фізичне виховання',
    ])
    expect(g446.columns.map((c) => c.nameUk)).toEqual([
      'Автомобілі та їх конструкція',
      'Електрообладнання автомобілів',
      'Єдиний державний кваліфікаційний іспит',
    ])
    expect(g359.specialityName).toContain('071')
    expect(g446.specialityName).toContain('274')
  })

  it('форма контролю доходить до стовпців (CREDIT для «Фізичне виховання»)', async () => {
    const { groups } = await makeService().getGradeSheet('batch-1')
    const g359 = groups.find((g) => g.groupName === '359')!
    const phys = g359.columns.find((c) => c.nameUk === 'Фізичне виховання')!
    expect(phys.controlForm).toBe('CREDIT')
    expect(g359.columns.find((c) => c.code === 'ОК 1')!.controlForm).toBe('EXAM')
  })

  it('кожна група містить ЛИШЕ своїх студентів', async () => {
    const { groups } = await makeService().getGradeSheet('batch-1')
    const g359 = groups.find((g) => g.groupName === '359')!
    const g446 = groups.find((g) => g.groupName === '446')!
    expect(g359.rows.map((r) => r.lastNameUk).sort()).toEqual(['Абрамчук', 'Гецун'])
    expect(g446.rows.map((r) => r.lastNameUk).sort()).toEqual(['Анісімов', 'Бенесько'])
  })

  it('оцінки прив’язані до componentId і orderIndex рядка', async () => {
    const { groups } = await makeService().getGradeSheet('batch-1')
    const abramchuk = groups
      .find((g) => g.groupName === '359')!
      .rows.find((r) => r.lastNameUk === 'Абрамчук')!
    expect(abramchuk.grades[1].grade).toBe('EXCELLENT') // ОК 2 = Відмінно
    expect(abramchuk.grades[2].grade).toBe('PASSED') // Фізвиховання = Зараховано
    expect(abramchuk.grades[0].componentId).toBe('d1-ОК 1')
  })
})
