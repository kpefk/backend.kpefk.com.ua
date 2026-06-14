import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { CurriculumVersion } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateCalendarEntryDto } from './dto/create-calendar-entry.dto'
import { CreateComponentDto } from './dto/create-component.dto'
import { CreateComponentProjectionDto } from './dto/create-component-projection.dto'
import { CreateComponentTermDto } from './dto/create-component-term.dto'
import { CreateCurriculumVersionDto } from './dto/create-curriculum-version.dto'
import { CreateElectiveBlockDto } from './dto/create-elective-block.dto'
import { CreateSectionDto } from './dto/create-section.dto'
import { CreateTimeBudgetEntryDto } from './dto/create-time-budget-entry.dto'
import { UpdateComponentDto } from './dto/update-component.dto'
import { UpdateComponentTermDto } from './dto/update-component-term.dto'
import { UpdateSectionDto } from './dto/update-section.dto'

// ─── Immutability guard ───────────────────────────────────────────────────────

/**
 * Перевіряє, що версія плану ще не опублікована.
 * Будь-яка спроба редагувати опубліковану версію кидає BadRequestException.
 */
function assertDraft(version: Pick<CurriculumVersion, 'isPublished' | 'versionNumber'>): void {
  if (version.isPublished) {
    throw new BadRequestException(
      `Версія ${version.versionNumber} вже опублікована і не може бути змінена. Створіть нову версію для внесення змін.`,
    )
  }
}

// ─── Selects ─────────────────────────────────────────────────────────────────

const VERSION_SUMMARY_SELECT = {
  id: true,
  versionNumber: true,
  approvalDate: true,
  approvalOrderNumber: true,
  approvedBy: true,
  isPublished: true,
  publishedAt: true,
  deprecatedAt: true,
  createdAt: true,
} as const

@Injectable()
export class CurriculumVersionsService {
  private readonly logger = new Logger(CurriculumVersionsService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── Version CRUD ──────────────────────────────────────────────────────────

  /**
   * Повертає повну структуру версії плану зі всіма секціями, компонентами, розподілами
   * та інтеграційними проекціями компонентів.
   *
   * Реалізація використовує два запити:
   *   1. Основний запит — вся структура версії (розділи, компоненти, терміни).
   *   2. Запит проекцій — усі display projections для компонентів цієї версії.
   *
   * Далі в сервісному шарі формуємо масив displayRows для кожного розділу:
   * канонічні компоненти (countsInTotals = true) + проекційні рядки (countsInTotals = false).
   * Жодних дублікатів у БД — лише мережа відображень.
   */
  public async findById(id: string) {
    const version = await this.prisma.curriculumVersion.findUnique({
      where: { id },
      include: {
        curriculum: {
          include: {
            program: {
              include: { specialty: { select: { id: true, code: true, name: true } } },
            },
          },
        },
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            electiveBlocks: {
              orderBy: { orderIndex: 'asc' },
            },
            components: {
              orderBy: { orderIndex: 'asc' },
              include: {
                terms: { orderBy: { semesterNumber: 'asc' } },
              },
            },
          },
        },
        timeBudgetEntries: { orderBy: { orderIndex: 'asc' } },
        calendarEntries: {
          orderBy: [{ courseNumber: 'asc' }, { semesterNumber: 'asc' }, { weekNumber: 'asc' }],
        },
        _count: { select: { groupAssignments: true, workingCurricula: true } },
      },
    })

    if (!version) throw new NotFoundException('Версію навчального плану не знайдено.')

    // Load all display projections for components belonging to this version.
    // Filter path: projection.component → section → version ensures same-version guarantee.
    const projections = await this.prisma.curriculumComponentDisplayInSection.findMany({
      where: { component: { section: { versionId: id } } },
      include: {
        component: {
          include: { terms: { orderBy: { semesterNumber: 'asc' } } },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    // Group projections by their target section so we can append them below.
    const projsBySection = new Map<string, typeof projections>()
    for (const p of projections) {
      const list = projsBySection.get(p.sectionId) ?? []
      list.push(p)
      projsBySection.set(p.sectionId, list)
    }

    // Augment each section: canonical components first, projected display-rows appended.
    // Projection rows carry the canonical data with extra flags so the frontend can
    // distinguish display-only rows from count-in-totals canonical rows.
    const enrichedSections = version.sections.map((sec) => {
      const canonicalRows = sec.components.map((c) => ({
        ...c,
        isProjected: false as const,
        sourceSectionId: null as string | null,
        countsInTotals: true as const,
        displayMarker: null as string | null,
        displayNote: null as string | null,
        projectionId: null as string | null,
      }))

      const projectedRows = (projsBySection.get(sec.id) ?? []).map((p) => ({
        ...p.component,
        isProjected: true as const,
        // sourceSectionId = the canonical home section of this component
        sourceSectionId: p.component.sectionId,
        countsInTotals: false as const,
        displayMarker: p.displayMarker,
        displayNote: p.displayNote,
        projectionId: p.id,
      }))

      return { ...sec, components: [...canonicalRows, ...projectedRows] }
    })

    return { ...version, sections: enrichedSections }
  }

  /**
   * Створює нову чернеткову версію навчального плану.
   * Номер версії обчислюється автоматично.
   */
  public async create(curriculumId: string, dto: CreateCurriculumVersionDto) {
    const curriculum = await this.prisma.curriculum.findUnique({ where: { id: curriculumId } })
    if (!curriculum) throw new NotFoundException('Навчальний план не знайдено.')

    const lastVersion = await this.prisma.curriculumVersion.findFirst({
      where: { curriculumId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    })

    const nextNumber = (lastVersion?.versionNumber ?? 0) + 1

    return this.prisma.curriculumVersion.create({
      data: {
        curriculumId,
        versionNumber: nextNumber,
        approvalDate: dto.approvalDate ? new Date(dto.approvalDate) : null,
        approvalOrderNumber: dto.approvalOrderNumber?.trim() ?? null,
        approvedBy: dto.approvedBy?.trim() ?? null,
        notes: dto.notes ?? null,
        isPublished: false,
      },
      include: { curriculum: true },
    })
  }

  /**
   * Публікує версію навчального плану.
   * Після публікації структура стає незмінною.
   */
  public async publish(id: string) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id } })
    if (!version) throw new NotFoundException('Версію не знайдено.')
    if (version.isPublished) {
      throw new BadRequestException('Версія вже опублікована.')
    }

    // [HARD BLOCK] Повинна мати хоча б один розділ
    const sectionCount = await this.prisma.curriculumSection.count({ where: { versionId: id } })
    if (sectionCount === 0) {
      throw new BadRequestException(
        'Не можна опублікувати порожній план: додайте хоча б один розділ і компоненти.',
      )
    }

    const warnings: string[] = []

    // [SOFT WARN] Вибіркові компоненти < 25% загального обсягу (ст. 49 ч. 2 Закону №2745-VIII)
    const components = await this.prisma.curriculumComponent.findMany({
      where: { section: { versionId: id } },
      select: { totalHours: true, isMandatory: true },
    })
    if (components.length > 0) {
      const totalHours    = components.reduce((s, c) => s + c.totalHours, 0)
      const electiveHours = components.filter((c) => !c.isMandatory).reduce((s, c) => s + c.totalHours, 0)
      const electiveRatio = totalHours > 0 ? electiveHours / totalHours : 0
      if (electiveRatio < 0.25) {
        warnings.push(
          `Вибіркові компоненти складають ${Math.round(electiveRatio * 100)}% загального обсягу (${electiveHours} з ${totalHours} год.). ` +
          'Ст. 49 ч. 2 Закону №2745-VIII вимагає не менше 25%. ' +
          'Перевірте наявність ВК або позначте відповідні ОК як вибіркові (isMandatory = false).',
        )
      }
    }

    const published = await this.prisma.curriculumVersion.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    })

    return { version: published, warnings }
  }

  /**
   * Депрекує версію (позначає як застарілу).
   * Версія залишається в БД для историчних запитів.
   */
  public async deprecate(id: string) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id } })
    if (!version) throw new NotFoundException('Версію не знайдено.')
    if (version.deprecatedAt) {
      throw new BadRequestException('Версія вже депрекована.')
    }
    return this.prisma.curriculumVersion.update({
      where: { id },
      data: { deprecatedAt: new Date() },
    })
  }

  /**
   * Видаляє чернеткову версію навчального плану разом з усією її структурою.
   *
   * Дозволено лише якщо:
   *   - версія є чернеткою (isPublished = false, deprecatedAt = null)
   *   - відсутні прив'язки груп (groupAssignments)
   *   - відсутні робочі навчальні плани (workingCurricula)
   *
   * Видалення каскадне всередині транзакції: терміни → компоненти →
   * вибіркові блоки → розділи → бюджет часу → календар → версія.
   */
  public async deleteVersion(versionId: string): Promise<void> {
    const version = await this.prisma.curriculumVersion.findUnique({
      where: { id: versionId },
      include: {
        _count: { select: { groupAssignments: true, workingCurricula: true } },
      },
    })

    if (!version) throw new NotFoundException('Версію навчального плану не знайдено.')

    if (version.isPublished) {
      throw new BadRequestException(
        'Неможливо видалити опубліковану версію навчального плану.',
      )
    }
    if (version.deprecatedAt) {
      throw new BadRequestException(
        'Неможливо видалити застарілу версію навчального плану.',
      )
    }
    if (version._count.groupAssignments > 0) {
      throw new BadRequestException(
        'Версія має прив\'язані групи і не може бути видалена.',
      )
    }
    if (version._count.workingCurricula > 0) {
      throw new BadRequestException(
        'Версія використовується в робочих навчальних планах і не може бути видалена.',
      )
    }

    await this.prisma.$transaction(async (tx) => {
      // Collect IDs that will be needed for ordered deletion
      const sections = await tx.curriculumSection.findMany({
        where: { versionId },
        select: { id: true, components: { select: { id: true } } },
      })
      const sectionIds = sections.map((s) => s.id)
      const componentIds = sections.flatMap((s) => s.components.map((c) => c.id))

      // 1. Component terms (leaf — references component, which has Restrict)
      if (componentIds.length > 0) {
        await tx.curriculumComponentTerm.deleteMany({
          where: { componentId: { in: componentIds } },
        })
        // 2. Components
        await tx.curriculumComponent.deleteMany({
          where: { id: { in: componentIds } },
        })
      }

      // 3. Elective blocks (references section, which has Restrict)
      if (sectionIds.length > 0) {
        await tx.electiveBlock.deleteMany({
          where: { sectionId: { in: sectionIds } },
        })
        // 4. Sections
        await tx.curriculumSection.deleteMany({
          where: { id: { in: sectionIds } },
        })
      }

      // 5. Time budget entries
      await tx.timeBudgetEntry.deleteMany({ where: { versionId } })

      // 6. Academic calendar entries
      await tx.academicCalendarEntry.deleteMany({ where: { versionId } })

      // 7. Version itself
      await tx.curriculumVersion.delete({ where: { id: versionId } })
    })
  }

  /**
   * Дублює структуру попередньої версії у нову чернеткову версію.
   * Зручно для внесення виправлень: копія → редагування → публікація.
   */
  public async duplicateFrom(sourceVersionId: string, curriculumId: string) {
    const source = await this.prisma.curriculumVersion.findUnique({
      where: { id: sourceVersionId },
      include: {
        sections: {
          include: {
            electiveBlocks: true,
            components: { include: { terms: true } },
          },
        },
        timeBudgetEntries: true,
        calendarEntries: true,
      },
    })
    if (!source) throw new NotFoundException('Вихідну версію не знайдено.')

    const curriculum = await this.prisma.curriculum.findUnique({ where: { id: curriculumId } })
    if (!curriculum) throw new NotFoundException('Навчальний план не знайдено.')

    const lastVersion = await this.prisma.curriculumVersion.findFirst({
      where: { curriculumId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    })

    const nextNumber = (lastVersion?.versionNumber ?? 0) + 1

    // Виконуємо копіювання всередині транзакції
    return this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.curriculumVersion.create({
        data: {
          curriculumId,
          versionNumber: nextNumber,
          approvalDate: source.approvalDate,
          approvalOrderNumber: source.approvalOrderNumber,
          approvedBy: source.approvedBy,
          notes: `Копія версії ${source.versionNumber}`,
          isPublished: false,
        },
      })

      // Track old→new ID mappings for projections copy below
      const sectionIdMap = new Map<string, string>()
      const componentIdMap = new Map<string, string>()

      for (const section of source.sections) {
        const newSection = await tx.curriculumSection.create({
          data: {
            versionId: newVersion.id,
            code: section.code,
            name: section.name,
            orderIndex: section.orderIndex,
            sectionType: section.sectionType,
            subtotalEcts: section.subtotalEcts,
          },
        })
        sectionIdMap.set(section.id, newSection.id)

        // Спочатку копіюємо блоки вибіркових компонентів
        const blockIdMap = new Map<string, string>()
        for (const block of section.electiveBlocks) {
          const newBlock = await tx.electiveBlock.create({
            data: {
              sectionId: newSection.id,
              name: block.name,
              semesterNumber: block.semesterNumber,
              minSelections: block.minSelections,
              maxSelections: block.maxSelections,
              orderIndex: block.orderIndex,
            },
          })
          blockIdMap.set(block.id, newBlock.id)
        }

        for (const component of section.components) {
          const newComponent = await tx.curriculumComponent.create({
            data: {
              sectionId: newSection.id,
              electiveBlockId: component.electiveBlockId
                ? (blockIdMap.get(component.electiveBlockId) ?? null)
                : null,
              code: component.code,
              name: component.name,
              componentType: component.componentType,
              componentKind: component.componentKind,
              totalEcts: component.totalEcts,
              totalHours: component.totalHours,
              orderIndex: component.orderIndex,
              isMandatory: component.isMandatory,
              practiceType: component.practiceType,
              courseWorkCount: component.courseWorkCount,
              courseProjectCount: component.courseProjectCount,
              notes: component.notes,
              // Hours breakdown
              auditoryHours: component.auditoryHours,
              lectureHours: component.lectureHours,
              practicalHours: component.practicalHours,
              seminarHours: component.seminarHours,
              labHours: component.labHours,
              selfStudyHours: component.selfStudyHours,
              otherHours: component.otherHours,
              znoPreparationHours: component.znoPreparationHours,
              // Elective group
              groupCode: component.groupCode,
              // parentComponentId intentionally not copied — hierarchy must be rebuilt by the user
            },
          })
          componentIdMap.set(component.id, newComponent.id)

          for (const term of component.terms) {
            await tx.curriculumComponentTerm.create({
              data: {
                componentId: newComponent.id,
                semesterNumber: term.semesterNumber,
                ects: term.ects,
                hours: term.hours,
                hoursPerWeek: term.hoursPerWeek,
                controlForm: term.controlForm,
                hasCourseWork: term.hasCourseWork,
                hasCourseProject: term.hasCourseProject,
              },
            })
          }
        }
      }

      // Copy display projections, remapping component and section IDs to their new counterparts.
      // Projections whose component or target section couldn't be mapped are silently skipped
      // (should not happen in practice since all sections/components are copied above).
      const sourceProjections = await tx.curriculumComponentDisplayInSection.findMany({
        where: { component: { section: { versionId: source.id } } },
      })
      for (const proj of sourceProjections) {
        const newComponentId = componentIdMap.get(proj.componentId)
        const newSectionId = sectionIdMap.get(proj.sectionId)
        if (newComponentId && newSectionId) {
          await tx.curriculumComponentDisplayInSection.create({
            data: {
              componentId: newComponentId,
              sectionId: newSectionId,
              displayOrder: proj.displayOrder,
              displayMarker: proj.displayMarker,
              displayNote: proj.displayNote,
            },
          })
        }
      }

      // Копіюємо бюджет часу
      for (const entry of source.timeBudgetEntries) {
        await tx.timeBudgetEntry.create({
          data: {
            versionId: newVersion.id,
            label: entry.label,
            totalHours: entry.totalHours,
            totalEcts: entry.totalEcts,
            orderIndex: entry.orderIndex,
          },
        })
      }

      // Копіюємо графік навчального процесу
      for (const entry of source.calendarEntries) {
        await tx.academicCalendarEntry.create({
          data: {
            versionId: newVersion.id,
            courseNumber: entry.courseNumber,
            semesterNumber: entry.semesterNumber,
            weekNumber: entry.weekNumber,
            weekType: entry.weekType,
          },
        })
      }

      return newVersion
    })
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  public async createSection(versionId: string, dto: CreateSectionDto) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id: versionId } })
    if (!version) throw new NotFoundException('Версію не знайдено.')
    assertDraft(version)

    return this.prisma.curriculumSection.create({
      data: {
        versionId,
        code: dto.code?.trim() ?? null,
        name: dto.name.trim(),
        orderIndex: dto.orderIndex,
        sectionType: dto.sectionType,
        subtotalEcts: dto.subtotalEcts ?? null,
      },
    })
  }

  public async updateSection(sectionId: string, dto: UpdateSectionDto) {
    const section = await this.prisma.curriculumSection.findUnique({
      where: { id: sectionId },
      include: { version: { select: { isPublished: true, versionNumber: true } } },
    })
    if (!section) throw new NotFoundException('Розділ не знайдено.')
    assertDraft(section.version)

    return this.prisma.curriculumSection.update({
      where: { id: sectionId },
      data: {
        ...(dto.code !== undefined && { code: dto.code?.trim() ?? null }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
        ...(dto.sectionType !== undefined && { sectionType: dto.sectionType }),
        ...(dto.subtotalEcts !== undefined && { subtotalEcts: dto.subtotalEcts ?? null }),
      },
    })
  }

  public async deleteSection(sectionId: string) {
    const section = await this.prisma.curriculumSection.findUnique({
      where: { id: sectionId },
      include: { version: { select: { isPublished: true, versionNumber: true } } },
    })
    if (!section) throw new NotFoundException('Розділ не знайдено.')
    assertDraft(section.version)

    // Cascade: terms → components → section (all FK-restricted, must delete in order)
    const components = await this.prisma.curriculumComponent.findMany({
      where: { sectionId },
      select: { id: true },
    })
    const componentIds = components.map((c) => c.id)

    return this.prisma.$transaction([
      this.prisma.curriculumComponentTerm.deleteMany({
        where: { componentId: { in: componentIds } },
      }),
      this.prisma.curriculumComponent.deleteMany({ where: { sectionId } }),
      this.prisma.curriculumSection.delete({ where: { id: sectionId } }),
    ])
  }

  // ── Elective Blocks ───────────────────────────────────────────────────────

  public async createElectiveBlock(sectionId: string, dto: CreateElectiveBlockDto) {
    const section = await this.prisma.curriculumSection.findUnique({
      where: { id: sectionId },
      include: { version: { select: { isPublished: true, versionNumber: true } } },
    })
    if (!section) throw new NotFoundException('Розділ не знайдено.')
    assertDraft(section.version)

    if (dto.maxSelections < dto.minSelections) {
      throw new BadRequestException('maxSelections не може бути менше за minSelections.')
    }

    return this.prisma.electiveBlock.create({
      data: {
        sectionId,
        name: dto.name.trim(),
        semesterNumber: dto.semesterNumber,
        minSelections: dto.minSelections,
        maxSelections: dto.maxSelections,
        orderIndex: dto.orderIndex,
      },
    })
  }

  public async deleteElectiveBlock(id: string) {
    const block = await this.prisma.electiveBlock.findUnique({
      where: { id },
      include: {
        section: { include: { version: { select: { isPublished: true, versionNumber: true } } } },
        options: { select: { id: true } },
      },
    })
    if (!block) throw new NotFoundException('Блок вибіркових компонентів не знайдено.')
    assertDraft(block.section.version)
    if (block.options.length > 0) {
      throw new BadRequestException(
        `Блок містить ${block.options.length} компонент(ів). Перед видаленням відв'яжіть або видаліть їх.`,
      )
    }
    await this.prisma.electiveBlock.delete({ where: { id } })
  }

  // ── Components ────────────────────────────────────────────────────────────

  public async createComponent(sectionId: string, dto: CreateComponentDto) {
    const section = await this.prisma.curriculumSection.findUnique({
      where: { id: sectionId },
      include: { version: { select: { isPublished: true, versionNumber: true } } },
    })
    if (!section) throw new NotFoundException('Розділ не знайдено.')
    assertDraft(section.version)

    if (dto.electiveBlockId) {
      const block = await this.prisma.electiveBlock.findUnique({
        where: { id: dto.electiveBlockId },
      })
      if (!block || block.sectionId !== sectionId) {
        throw new BadRequestException('Блок вибіркових компонентів не належить до цього розділу.')
      }
    }

    return this.prisma.curriculumComponent.create({
      data: {
        sectionId,
        electiveBlockId: dto.electiveBlockId ?? null,
        code: dto.code?.trim() || null,
        name: dto.name.trim(),
        componentType: dto.componentType,
        componentKind: dto.componentKind ?? 'REGULAR',
        totalEcts: dto.totalEcts,
        // Derive hours from ECTS (1 ECTS = 30 h). For secondary-edu components
        // totalEcts arrives as 0 and totalHours is set manually by the user.
        totalHours: Number(dto.totalEcts) > 0
          ? Math.round(Number(dto.totalEcts) * 30)
          : (dto.totalHours ?? 0),
        orderIndex: dto.orderIndex,
        isMandatory: dto.isMandatory ?? true,
        practiceType: dto.practiceType ?? null,
        courseWorkCount: dto.courseWorkCount ?? 0,
        courseProjectCount: dto.courseProjectCount ?? 0,
        notes: dto.notes ?? null,
        // Hours breakdown
        auditoryHours: dto.auditoryHours ?? null,
        lectureHours: dto.lectureHours ?? null,
        practicalHours: dto.practicalHours ?? null,
        seminarHours: dto.seminarHours ?? null,
        labHours: dto.labHours ?? null,
        selfStudyHours: dto.selfStudyHours ?? null,
        otherHours: dto.otherHours ?? null,
        znoPreparationHours: dto.znoPreparationHours ?? null,
        // Elective group
        groupCode: dto.groupCode?.trim() ?? null,
        parentComponentId: dto.parentComponentId ?? null,
      },
      include: { terms: true },
    })
  }

  public async updateComponent(componentId: string, dto: UpdateComponentDto) {
    const component = await this.prisma.curriculumComponent.findUnique({
      where: { id: componentId },
      include: {
        section: {
          include: { version: { select: { isPublished: true, versionNumber: true } } },
        },
      },
    })
    if (!component) throw new NotFoundException('Компонент не знайдено.')
    assertDraft(component.section.version)

    return this.prisma.curriculumComponent.update({
      where: { id: componentId },
      data: {
        ...(dto.code !== undefined && { code: dto.code?.trim() || null }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.componentType !== undefined && { componentType: dto.componentType }),
        ...(dto.componentKind !== undefined && { componentKind: dto.componentKind }),
        // When totalEcts changes, derive totalHours (1 ECTS = 30 h).
        // Secondary-edu components have totalEcts = 0; in that case honour
        // the explicitly supplied totalHours (manual entry from the form).
        ...(dto.totalEcts !== undefined && {
          totalEcts: dto.totalEcts,
          totalHours: Number(dto.totalEcts) > 0
            ? Math.round(Number(dto.totalEcts) * 30)
            : (dto.totalHours !== undefined ? dto.totalHours : Number(component.totalHours)),
        }),
        // Independent totalHours update only when totalEcts was NOT changed
        // (e.g. secondary-edu edit where only hours need adjusting).
        ...(dto.totalHours !== undefined && dto.totalEcts === undefined && { totalHours: dto.totalHours }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
        ...(dto.isMandatory !== undefined && { isMandatory: dto.isMandatory }),
        ...(dto.practiceType !== undefined && { practiceType: dto.practiceType ?? null }),
        ...(dto.courseWorkCount !== undefined && { courseWorkCount: dto.courseWorkCount }),
        ...(dto.courseProjectCount !== undefined && { courseProjectCount: dto.courseProjectCount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.electiveBlockId !== undefined && { electiveBlockId: dto.electiveBlockId ?? null }),
        // Hours breakdown
        ...(dto.auditoryHours !== undefined && { auditoryHours: dto.auditoryHours ?? null }),
        ...(dto.lectureHours !== undefined && { lectureHours: dto.lectureHours ?? null }),
        ...(dto.practicalHours !== undefined && { practicalHours: dto.practicalHours ?? null }),
        ...(dto.seminarHours !== undefined && { seminarHours: dto.seminarHours ?? null }),
        ...(dto.labHours !== undefined && { labHours: dto.labHours ?? null }),
        ...(dto.selfStudyHours !== undefined && { selfStudyHours: dto.selfStudyHours ?? null }),
        ...(dto.otherHours !== undefined && { otherHours: dto.otherHours ?? null }),
        ...(dto.znoPreparationHours !== undefined && { znoPreparationHours: dto.znoPreparationHours ?? null }),
        // Elective group
        ...(dto.groupCode !== undefined && { groupCode: dto.groupCode?.trim() ?? null }),
        ...(dto.parentComponentId !== undefined && { parentComponentId: dto.parentComponentId ?? null }),
      },
      include: { terms: true },
    })
  }

  public async deleteComponent(componentId: string) {
    const component = await this.prisma.curriculumComponent.findUnique({
      where: { id: componentId },
      include: {
        section: {
          include: { version: { select: { isPublished: true, versionNumber: true } } },
        },
      },
    })
    if (!component) throw new NotFoundException('Компонент не знайдено.')
    assertDraft(component.section.version)

    // Delete terms first (FK: curriculum_component_terms.component_id → curriculum_components.id)
    return this.prisma.$transaction([
      this.prisma.curriculumComponentTerm.deleteMany({ where: { componentId } }),
      this.prisma.curriculumComponent.delete({ where: { id: componentId } }),
    ])
  }

  // ── Component Display Projections ────────────────────────────────────────

  /**
   * Додає відображення компонента в додатковий розділ (інтеграційна проекція).
   *
   * Інваріанти:
   *   • Компонент і цільовий розділ повинні належати до тієї самої версії (versionId).
   *   • Цільовий розділ ≠ основний розділ компонента.
   *   • Версія повинна бути чернеткою (не опублікованою).
   *   • Пара (componentId, sectionId) унікальна — перевіряється constraint.
   */
  public async createProjection(versionId: string, dto: CreateComponentProjectionDto) {
    // Load canonical component and verify it belongs to this version
    const component = await this.prisma.curriculumComponent.findUnique({
      where: { id: dto.componentId },
      include: {
        section: { select: { id: true, versionId: true } },
      },
    })
    if (!component) throw new NotFoundException('Компонент не знайдено.')
    if (component.section.versionId !== versionId) {
      throw new BadRequestException(
        'Компонент не належить до вказаної версії навчального плану.',
      )
    }

    // Load target section and verify same version + draft status
    const targetSection = await this.prisma.curriculumSection.findUnique({
      where: { id: dto.targetSectionId },
      include: { version: { select: { isPublished: true, versionNumber: true } } },
    })
    if (!targetSection) throw new NotFoundException('Цільовий розділ не знайдено.')
    if (targetSection.versionId !== versionId) {
      throw new BadRequestException(
        'Цільовий розділ не належить до вказаної версії навчального плану.',
      )
    }
    assertDraft(targetSection.version)

    // Cannot project into the component's own primary section
    if (dto.targetSectionId === component.sectionId) {
      throw new BadRequestException(
        'Неможливо створити проекцію компонента в його основний розділ.',
      )
    }

    // Create projection (unique constraint on (componentId, sectionId) prevents duplicates)
    try {
      return await this.prisma.curriculumComponentDisplayInSection.create({
        data: {
          componentId: dto.componentId,
          sectionId: dto.targetSectionId,
          displayOrder: dto.displayOrder ?? 0,
          displayMarker: dto.displayMarker?.trim() ?? null,
          displayNote: dto.displayNote?.trim() ?? null,
        },
      })
    } catch (e: unknown) {
      // P2002 = unique constraint violation
      if ((e as { code?: string }).code === 'P2002') {
        throw new BadRequestException(
          'Проекцію цього компонента в обраний розділ вже існує.',
        )
      }
      throw e
    }
  }

  /**
   * Видаляє інтеграційну проекцію компонента.
   * Версія повинна бути чернеткою — опублікована версія незмінна.
   */
  public async deleteProjection(projectionId: string): Promise<void> {
    const projection = await this.prisma.curriculumComponentDisplayInSection.findUnique({
      where: { id: projectionId },
      include: {
        component: {
          include: {
            section: {
              include: { version: { select: { isPublished: true, versionNumber: true } } },
            },
          },
        },
      },
    })
    if (!projection) throw new NotFoundException('Проекцію не знайдено.')
    assertDraft(projection.component.section.version)

    await this.prisma.curriculumComponentDisplayInSection.delete({ where: { id: projectionId } })
  }

  // ── Component Terms ───────────────────────────────────────────────────────

  public async createComponentTerm(componentId: string, dto: CreateComponentTermDto) {
    const component = await this.prisma.curriculumComponent.findUnique({
      where: { id: componentId },
      include: {
        section: {
          include: { version: { select: { isPublished: true, versionNumber: true } } },
        },
      },
    })
    if (!component) throw new NotFoundException('Компонент не знайдено.')
    assertDraft(component.section.version)

    const existing = await this.prisma.curriculumComponentTerm.findUnique({
      where: { componentId_semesterNumber: { componentId, semesterNumber: dto.semesterNumber } },
    })
    if (existing) {
      throw new BadRequestException(
        `Розподіл для компонента в семестрі ${dto.semesterNumber} вже існує.`,
      )
    }

    // Guard: sum of all term hours must not exceed component.totalHours
    const siblings = await this.prisma.curriculumComponentTerm.findMany({
      where: { componentId },
      select: { hours: true },
    })
    const allocatedHours = siblings.reduce((sum, t) => sum + t.hours, 0)
    if (allocatedHours + dto.hours > component.totalHours) {
      throw new BadRequestException(
        `Сума годин по семестрах (${allocatedHours + dto.hours}) перевищує загальний обсяг компонента (${component.totalHours} год.).`,
      )
    }

    // [SOFT WARN] subgroupCount = 2 без підстави — фіксуємо в логах, не блокуємо
    if ((dto.subgroupCount ?? 1) >= 2 && !dto.subgroupJustification) {
      this.logger.warn(
        `ComponentTerm componentId=${componentId} sem=${dto.semesterNumber}: ` +
        'subgroupCount=2 без subgroupJustification — підстава для поділу не вказана (Наказ МОН №686 п.5).',
      )
    }

    return this.prisma.curriculumComponentTerm.create({
      data: {
        componentId,
        semesterNumber: dto.semesterNumber,
        ects: dto.ects ?? 0,
        hours: dto.hours,
        hoursPerWeek: dto.hoursPerWeek ?? null,
        controlForm: dto.controlForm ?? null,
        hasCourseWork: dto.hasCourseWork ?? false,
        hasCourseProject: dto.hasCourseProject ?? false,
        subgroupCount: dto.subgroupCount ?? 1,
        subgroupJustification: dto.subgroupJustification ?? null,
      },
    })
  }

  public async updateComponentTerm(termId: string, dto: UpdateComponentTermDto) {
    const term = await this.prisma.curriculumComponentTerm.findUnique({
      where: { id: termId },
      include: {
        component: {
          include: {
            section: {
              include: { version: { select: { isPublished: true, versionNumber: true } } },
            },
          },
        },
      },
    })
    if (!term) throw new NotFoundException('Розподіл не знайдено.')
    assertDraft(term.component.section.version)

    // Guard: only when hours are being updated
    if (dto.hours !== undefined) {
      const siblings = await this.prisma.curriculumComponentTerm.findMany({
        where: { componentId: term.componentId, NOT: { id: termId } },
        select: { hours: true },
      })
      const otherHours = siblings.reduce((sum, t) => sum + t.hours, 0)
      if (otherHours + dto.hours > term.component.totalHours) {
        throw new BadRequestException(
          `Сума годин по семестрах (${otherHours + dto.hours}) перевищує загальний обсяг компонента (${term.component.totalHours} год.).`,
        )
      }
    }

    // [SOFT WARN] subgroupCount = 2 без підстави
    const newSubgroupCount = dto.subgroupCount ?? term.subgroupCount
    const newJustification = dto.subgroupJustification !== undefined
      ? dto.subgroupJustification
      : term.subgroupJustification
    if (newSubgroupCount >= 2 && !newJustification) {
      this.logger.warn(
        `ComponentTerm id=${termId}: subgroupCount=2 без subgroupJustification ` +
        '— підстава для поділу не вказана (Наказ МОН №686 п.5).',
      )
    }

    return this.prisma.curriculumComponentTerm.update({
      where: { id: termId },
      data: {
        ...(dto.ects !== undefined && { ects: dto.ects }),
        ...(dto.hours !== undefined && { hours: dto.hours }),
        ...(dto.hoursPerWeek !== undefined && { hoursPerWeek: dto.hoursPerWeek ?? null }),
        ...(dto.controlForm !== undefined && { controlForm: dto.controlForm }),
        ...(dto.hasCourseWork !== undefined && { hasCourseWork: dto.hasCourseWork }),
        ...(dto.hasCourseProject !== undefined && { hasCourseProject: dto.hasCourseProject }),
        ...(dto.subgroupCount !== undefined && { subgroupCount: dto.subgroupCount }),
        ...(dto.subgroupJustification !== undefined && { subgroupJustification: dto.subgroupJustification ?? null }),
        // Зміна semesterNumber недозволена — це ключова частина уніку
      },
    })
  }

  public async deleteComponentTerm(termId: string) {
    const term = await this.prisma.curriculumComponentTerm.findUnique({
      where: { id: termId },
      include: {
        component: {
          include: {
            section: {
              include: { version: { select: { isPublished: true, versionNumber: true } } },
            },
          },
        },
      },
    })
    if (!term) throw new NotFoundException('Розподіл не знайдено.')
    assertDraft(term.component.section.version)

    return this.prisma.curriculumComponentTerm.delete({ where: { id: termId } })
  }

  // ── Time Budget ───────────────────────────────────────────────────────────

  public async createTimeBudgetEntry(versionId: string, dto: CreateTimeBudgetEntryDto) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id: versionId } })
    if (!version) throw new NotFoundException('Версію не знайдено.')
    assertDraft(version)

    return this.prisma.timeBudgetEntry.create({
      data: {
        versionId,
        label: dto.label.trim(),
        totalHours: dto.totalHours,
        totalEcts: dto.totalEcts ?? null,
        orderIndex: dto.orderIndex,
      },
    })
  }

  public async deleteTimeBudgetEntry(entryId: string) {
    const entry = await this.prisma.timeBudgetEntry.findUnique({
      where: { id: entryId },
      include: { version: { select: { isPublished: true, versionNumber: true } } },
    })
    if (!entry) throw new NotFoundException('Запис бюджету не знайдено.')
    assertDraft(entry.version)

    return this.prisma.timeBudgetEntry.delete({ where: { id: entryId } })
  }

  // ── Academic Calendar ─────────────────────────────────────────────────────

  /**
   * Додає або оновлює запис календаря (upsert за унікальним ключем).
   */
  public async upsertCalendarEntry(versionId: string, dto: CreateCalendarEntryDto) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id: versionId } })
    if (!version) throw new NotFoundException('Версію не знайдено.')
    assertDraft(version)

    return this.prisma.academicCalendarEntry.upsert({
      where: {
        versionId_courseNumber_semesterNumber_weekNumber: {
          versionId,
          courseNumber: dto.courseNumber,
          semesterNumber: dto.semesterNumber,
          weekNumber: dto.weekNumber,
        },
      },
      create: {
        versionId,
        courseNumber: dto.courseNumber,
        semesterNumber: dto.semesterNumber,
        weekNumber: dto.weekNumber,
        weekType: dto.weekType,
      },
      update: { weekType: dto.weekType },
    })
  }

  public async deleteCalendarEntry(entryId: string) {
    const entry = await this.prisma.academicCalendarEntry.findUnique({
      where: { id: entryId },
      include: { version: { select: { isPublished: true, versionNumber: true } } },
    })
    if (!entry) throw new NotFoundException('Запис календаря не знайдено.')
    assertDraft(entry.version)

    return this.prisma.academicCalendarEntry.delete({ where: { id: entryId } })
  }
}
