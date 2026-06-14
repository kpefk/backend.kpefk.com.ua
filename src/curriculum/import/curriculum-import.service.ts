import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  ComponentType,
  CurriculumComponentType,
  CurriculumSectionType,
  PracticeType,
  Prisma,
  TermControlForm,
} from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { ImportCommitDto } from './dto/import-commit.dto'
import {
  CurriculumPart,
  ParsedComponent,
  ParsedCurriculum,
  ParsedSection,
} from './curriculum-import.types'
import { parseCurriculumWorkbook } from './curriculum-xls.parser'

/**
 * Виправляє кодування імені файлу з multipart.
 * Busboy декодує заголовок як latin1, тож UTF-8 байти кирилиці перетворюються
 * на «кракозябри» (Ð...). Перекодовуємо latin1→utf8 лише коли в рядку є типові
 * ознаки такого псування — щоб не зіпсувати вже коректні ASCII-імена.
 */
function decodeOriginalName(name: string): string {
  if (!/[À-ÿ]/.test(name)) return name // немає ознак mojibake
  const fixed = Buffer.from(name, 'latin1').toString('utf8')
  // Беремо виправлений варіант лише якщо він дав кириличні символи.
  return /[Ѐ-ӿ]/.test(fixed) ? fixed : name
}

// ─── Mapping helpers ───────────────────────────────────────────────────────────

/** Розділ Excel → тип розділу схеми (за частиною плану + ключовими словами назви). */
function mapSectionType(name: string, part: CurriculumPart): CurriculumSectionType {
  const n = name.toLowerCase()
  if (part === 'SECONDARY') {
    if (n.includes('базові компоненти')) return CurriculumSectionType.BASIC_OPP
    if (n.includes('вибірково-обов')) return CurriculumSectionType.ELECTIVE_OPP
    if (n.includes('факультатив')) return CurriculumSectionType.OPTIONAL_COURSES
    return CurriculumSectionType.SECONDARY_EDUCATION
  }
  if (n.includes('загальні компетентн')) return CurriculumSectionType.GENERAL_COMPETENCY
  if (n.includes('за вибором') || n.includes('вибіркова')) return CurriculumSectionType.ELECTIVE
  if (n.includes('практ')) return CurriculumSectionType.PRACTICE
  if (n.includes('атестац')) return CurriculumSectionType.ATTESTATION
  return CurriculumSectionType.PROFESSIONAL_COMPETENCY
}

/** Назва компонента → тип компонента схеми. */
function mapComponentType(name: string): ComponentType {
  const n = name.toLowerCase()
  if (n.includes('практика')) return ComponentType.PRACTICE
  if (n.includes('дипломне проект')) return ComponentType.DIPLOMA_PROJECT
  if (n.includes('захист кваліфікаційної')) return ComponentType.QUALIFICATION_WORK_DEFENSE
  if (n.includes('кваліфікаційн') && (n.includes('іспит') || n.includes('екзамен')))
    return ComponentType.QUALIFICATION_EXAM
  if (n.includes('дпа') || n.includes('зно') || n.includes('нмт') || n.includes('державн'))
    return ComponentType.STATE_EXAM
  return ComponentType.DISCIPLINE
}

/** Назва практики → тип практики. */
function mapPracticeType(name: string): PracticeType | null {
  const n = name.toLowerCase()
  if (!n.includes('практика')) return null
  if (n.includes('переддипломна')) return PracticeType.PRE_GRADUATION
  if (n.includes('технологічна') || n.includes('виробнич')) return PracticeType.TECHNOLOGICAL
  return PracticeType.EDUCATIONAL
}

/** Укрупнена категорія компонента. */
function mapComponentKind(
  componentType: ComponentType,
  isElective: boolean,
): CurriculumComponentType {
  if (isElective) return CurriculumComponentType.ELECTIVE_GROUP
  if (componentType === ComponentType.PRACTICE) return CurriculumComponentType.PRACTICE
  if (
    componentType === ComponentType.DIPLOMA_PROJECT ||
    componentType === ComponentType.QUALIFICATION_WORK_DEFENSE ||
    componentType === ComponentType.QUALIFICATION_EXAM ||
    componentType === ComponentType.STATE_EXAM
  )
    return CurriculumComponentType.ATTESTATION
  return CurriculumComponentType.REGULAR
}

/** Форма контролю для семестру за списками екзаменів/заліків. */
function controlFormFor(
  semester: number,
  comp: ParsedComponent,
): TermControlForm | null {
  if (comp.examSemesters.includes(semester)) return TermControlForm.EXAM
  if (comp.creditSemesters.includes(semester)) return TermControlForm.CREDIT
  return null
}

const round2 = (n: number): number => Math.round(n * 100) / 100

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CurriculumImportService {
  private readonly logger = new Logger(CurriculumImportService.name)

  public constructor(private readonly prisma: PrismaService) {}

  /** Крок 1 (dry-run): парсить .xls без запису в БД. */
  public preview(file: Express.Multer.File): ParsedCurriculum {
    return parseCurriculumWorkbook(file.buffer, decodeOriginalName(file.originalname))
  }

  /** Крок 2: фіксує розпарсений план у БД як НОВУ чернеткову версію. */
  public async commit(dto: ImportCommitDto) {
    const program = await this.prisma.educationalProgram.findUnique({
      where: { id: dto.programId },
      select: { id: true },
    })
    if (!program) throw new NotFoundException('Освітню програму (ОПП) не знайдено.')

    const parsed = dto.parsed

    // Сумарні ЄКТС плану — сума ЄКТС компонентів фахової частини.
    const totalEcts = round2(
      parsed.sections
        .filter((s) => s.part === 'PROFESSIONAL')
        .flatMap((s) => s.components)
        .reduce((acc, c) => acc + (c.ects ?? 0), 0),
    )

    return this.prisma.$transaction(async (tx) => {
      // Find-or-create контейнер навчального плану (унікальний ключ).
      const curriculum = await tx.curriculum.upsert({
        where: {
          programId_educationForm_admissionBasis_entryYear: {
            programId: dto.programId,
            educationForm: dto.educationForm,
            admissionBasis: dto.admissionBasis,
            entryYear: dto.entryYear,
          },
        },
        create: {
          programId: dto.programId,
          educationForm: dto.educationForm,
          admissionBasis: dto.admissionBasis,
          entryYear: dto.entryYear,
          studyDurationMonths: dto.studyDurationMonths,
          totalEcts: new Prisma.Decimal(totalEcts),
        },
        update: {},
        select: { id: true },
      })

      // Номер нової версії.
      const last = await tx.curriculumVersion.findFirst({
        where: { curriculumId: curriculum.id },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      })
      const versionNumber = (last?.versionNumber ?? 0) + 1

      const version = await tx.curriculumVersion.create({
        data: {
          curriculumId: curriculum.id,
          versionNumber,
          // Метадані затвердження не вводяться — плани вже офіційно затверджені.
          isPublished: false,
          notes: `Імпортовано з «${parsed.meta.sourceFile}»`,
        },
        select: { id: true },
      })

      // ── Інтеграція освітніх компонентів («*») ──────────────────────────────
      // Інтегрований предмет = ОДИН канонічний компонент (формальний ОПП ОКn) +
      // проєкція у розділ ЗСО. Так навантаження рахується один раз (один набір
      // термінів → один викладач), а предмет показано в обох частинах плану.
      const oppCodes = new Set(
        parsed.sections
          .filter((s) => s.part === 'PROFESSIONAL')
          .flatMap((s) => s.components)
          .map((c) => c.code)
          .filter((c): c is string => !!c),
      )
      const integrationTargets = new Set(
        parsed.sections
          .flatMap((s) => s.components)
          .map((c) => c.integratedWithCode)
          .filter((c): c is string => !!c && oppCodes.has(c)),
      )

      // Розклад/години з рядка ЗСО за кодом ОКn (ОПП-рядок їх не містить).
      const deliveryByOkCode = new Map<string, ParsedComponent>()
      const canonicalIdByOkCode = new Map<string, string>()
      const pendingProjections: { okCode: string; sectionId: string; order: number }[] = []

      let sectionCount = 0
      let componentCount = 0
      let termCount = 0
      let projectionCount = 0

      for (let si = 0; si < parsed.sections.length; si++) {
        const sec = parsed.sections[si]
        // Пропускаємо порожні службові заголовки без компонентів.
        const realComponents = sec.components.filter((c) => !c.isElectivePlaceholder)
        if (realComponents.length === 0) continue

        const section = await tx.curriculumSection.create({
          data: {
            versionId: version.id,
            name: sec.name,
            orderIndex: si,
            sectionType: mapSectionType(sec.name, sec.part),
          },
          select: { id: true },
        })
        sectionCount++

        // Вибіркові блоки в межах розділу: один блок на groupCode (ВКn).
        const blockByGroup = new Map<string, string>()

        for (let ci = 0; ci < realComponents.length; ci++) {
          const comp = realComponents[ci]

          // 1. Рядок ЗСО інтегрованого предмета — компонент НЕ створюємо;
          //    запамʼятовуємо розклад і місце для майбутньої проєкції.
          if (
            sec.part === 'SECONDARY' &&
            comp.integratedWithCode &&
            integrationTargets.has(comp.integratedWithCode)
          ) {
            deliveryByOkCode.set(comp.integratedWithCode, comp)
            pendingProjections.push({
              okCode: comp.integratedWithCode,
              sectionId: section.id,
              order: ci,
            })
            continue
          }

          // 2. ОПП-рядок, що є ціллю інтеграції — канонічний компонент,
          //    збагачений розкладом і годинами з рядка ЗСО.
          if (sec.part === 'PROFESSIONAL' && comp.code && integrationTargets.has(comp.code)) {
            const delivery = deliveryByOkCode.get(comp.code)
            const effective: ParsedComponent = delivery
              ? {
                  ...comp,
                  totalHours: delivery.totalHours ?? comp.totalHours,
                  auditoryHours: delivery.auditoryHours,
                  lectureHours: delivery.lectureHours,
                  practicalHours: delivery.practicalHours,
                  seminarHours: delivery.seminarHours,
                  labHours: delivery.labHours,
                  selfStudyHours: delivery.selfStudyHours,
                  otherHours: delivery.otherHours,
                  examSemesters: delivery.examSemesters,
                  creditSemesters: delivery.creditSemesters,
                  courseWorkSemesters: delivery.courseWorkSemesters,
                  terms: delivery.terms,
                }
              : comp
            const id = await this.createComponent(tx, {
              section,
              comp: effective,
              orderIndex: ci,
              blockByGroup,
              noteOverride: 'Інтегрований освітній компонент — викладається у складі ЗСО',
            })
            canonicalIdByOkCode.set(comp.code, id)
            componentCount++
            termCount += effective.terms.length
            continue
          }

          // 3. Звичайний компонент.
          await this.createComponent(tx, { section, comp, orderIndex: ci, blockByGroup })
          componentCount++
          termCount += comp.terms.length
        }
      }

      // Проєкції канонічних інтегрованих компонентів у розділи ЗСО.
      for (const proj of pendingProjections) {
        const componentId = canonicalIdByOkCode.get(proj.okCode)
        if (!componentId) continue // ціль не знайдено — пропускаємо
        await tx.curriculumComponentDisplayInSection.create({
          data: {
            componentId,
            sectionId: proj.sectionId,
            displayOrder: proj.order,
            displayMarker: '*',
            displayNote: `Інтегрований ОК (${proj.okCode})`,
          },
        })
        projectionCount++
      }

      // Зведений бюджет часу (верифікаційна таблиця).
      let budgetIndex = 0
      for (const b of parsed.timeBudget) {
        const rows: [string, number | null][] = [
          ['Теоретичне навчання (тижнів)', b.theoryWeeks],
          ['Екзаменаційна сесія (тижнів)', b.sessionWeeks],
          ['Практика (тижнів)', b.practiceWeeks],
          ['Атестація (тижнів)', b.attestationWeeks],
          ['Канікули (тижнів)', b.holidayWeeks],
          ['Всього тижнів', b.totalWeeks],
        ]
        for (const [label, weeks] of rows) {
          if (weeks === null) continue
          await tx.timeBudgetEntry.create({
            data: {
              versionId: version.id,
              label: `${b.courseLabel}: ${label}`,
              totalHours: weeks, // у тижнях; зберігаємо як числове значення
              orderIndex: budgetIndex++,
            },
          })
        }
      }

      this.logger.log(
        `[Import] curriculum=${curriculum.id} version=${versionNumber} ` +
          `sections=${sectionCount} components=${componentCount} terms=${termCount} ` +
          `projections=${projectionCount}`,
      )

      return {
        curriculumId: curriculum.id,
        versionId: version.id,
        versionNumber,
        stats: {
          sections: sectionCount,
          components: componentCount,
          terms: termCount,
          projections: projectionCount,
        },
      }
    })
  }

  /**
   * Створює один компонент з термінами (і за потреби — вибірковий блок).
   * Повертає id створеного компонента.
   */
  private async createComponent(
    tx: Prisma.TransactionClient,
    args: {
      section: { id: string }
      comp: ParsedComponent
      orderIndex: number
      blockByGroup: Map<string, string>
      noteOverride?: string
    },
  ): Promise<string> {
    const { section, comp, orderIndex, blockByGroup } = args

    const componentType = mapComponentType(comp.name)
    const practiceType = mapPracticeType(comp.name)
    const componentKind = mapComponentKind(componentType, comp.isElective)

    // Вибірковий блок (один на ВКn у межах розділу).
    let electiveBlockId: string | null = null
    if (comp.isElective && comp.electiveGroupCode) {
      const existing = blockByGroup.get(comp.electiveGroupCode)
      if (existing) {
        electiveBlockId = existing
      } else {
        const semester = comp.terms[0]?.semesterNumber ?? 1
        const block = await tx.electiveBlock.create({
          data: {
            sectionId: section.id,
            name: `Вибірковий блок ${comp.electiveGroupCode}`,
            semesterNumber: semester,
            minSelections: 1,
            maxSelections: 1,
            orderIndex: blockByGroup.size,
          },
          select: { id: true },
        })
        electiveBlockId = block.id
        blockByGroup.set(comp.electiveGroupCode, block.id)
      }
    }

    const ects = comp.ects ?? 0
    const termHoursSum = comp.terms.reduce((acc, t) => acc + t.hours, 0)

    // Примітка: явний override (для канонічних інтегрованих) або звʼязок «(ОКn)».
    const notes =
      args.noteOverride ??
      (comp.integratedWithCode ? `Інтегровано з ${comp.integratedWithCode}` : null)

    const created = await tx.curriculumComponent.create({
      select: { id: true },
      data: {
        sectionId: section.id,
        electiveBlockId,
        code: comp.code,
        name: comp.name,
        notes,
        componentType,
        componentKind,
        practiceType,
        totalEcts: new Prisma.Decimal(ects),
        totalHours: comp.totalHours ?? 0,
        orderIndex,
        isMandatory: !comp.isElective,
        groupCode: comp.electiveGroupCode,
        courseWorkCount: comp.courseWorkSemesters.length,
        auditoryHours: comp.auditoryHours,
        lectureHours: comp.lectureHours,
        practicalHours: comp.practicalHours,
        seminarHours: comp.seminarHours,
        labHours: comp.labHours,
        selfStudyHours: comp.selfStudyHours,
        otherHours: comp.otherHours,
        terms: {
          create: comp.terms.map((t) => {
            const termEcts =
              ects > 0 && termHoursSum > 0 ? round2((ects * t.hours) / termHoursSum) : 0
            return {
              semesterNumber: t.semesterNumber,
              ects: new Prisma.Decimal(termEcts),
              hours: t.hours,
              hoursPerWeek: t.hoursPerWeek,
              controlForm: controlFormFor(t.semesterNumber, comp),
              hasCourseWork: comp.courseWorkSemesters.includes(t.semesterNumber),
            }
          }),
        },
      },
    })

    return created.id
  }
}
