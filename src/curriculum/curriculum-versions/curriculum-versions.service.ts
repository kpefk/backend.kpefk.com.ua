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
   * Повертає повну структуру версії плану зі всіма секціями, компонентами та розподілами.
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
    return version
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
        approvalDate: new Date(dto.approvalDate),
        approvalOrderNumber: dto.approvalOrderNumber.trim(),
        approvedBy: dto.approvedBy.trim(),
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

    // Базова валідація: повинна мати хоча б один розділ
    const sectionCount = await this.prisma.curriculumSection.count({ where: { versionId: id } })
    if (sectionCount === 0) {
      throw new BadRequestException(
        'Не можна опублікувати порожній план: додайте хоча б один розділ і компоненти.',
      )
    }

    return this.prisma.curriculumVersion.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    })
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
              totalEcts: component.totalEcts,
              totalHours: component.totalHours,
              orderIndex: component.orderIndex,
              isMandatory: component.isMandatory,
              practiceType: component.practiceType,
              courseWorkCount: component.courseWorkCount,
              courseProjectCount: component.courseProjectCount,
              notes: component.notes,
            },
          })

          for (const term of component.terms) {
            await tx.curriculumComponentTerm.create({
              data: {
                componentId: newComponent.id,
                semesterNumber: term.semesterNumber,
                ects: term.ects,
                hours: term.hours,
                controlForm: term.controlForm,
                hasCourseWork: term.hasCourseWork,
                hasCourseProject: term.hasCourseProject,
              },
            })
          }
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

    const componentCount = await this.prisma.curriculumComponent.count({
      where: { sectionId },
    })
    if (componentCount > 0) {
      throw new BadRequestException(
        'Неможливо видалити розділ, що містить компоненти. Спочатку видаліть всі компоненти.',
      )
    }

    return this.prisma.curriculumSection.delete({ where: { id: sectionId } })
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
        code: dto.code?.trim() ?? null,
        name: dto.name.trim(),
        componentType: dto.componentType,
        totalEcts: dto.totalEcts,
        totalHours: dto.totalHours,
        orderIndex: dto.orderIndex,
        isMandatory: dto.isMandatory ?? true,
        practiceType: dto.practiceType ?? null,
        courseWorkCount: dto.courseWorkCount ?? 0,
        courseProjectCount: dto.courseProjectCount ?? 0,
        notes: dto.notes ?? null,
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
        ...(dto.code !== undefined && { code: dto.code?.trim() ?? null }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.componentType !== undefined && { componentType: dto.componentType }),
        ...(dto.totalEcts !== undefined && { totalEcts: dto.totalEcts }),
        ...(dto.totalHours !== undefined && { totalHours: dto.totalHours }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
        ...(dto.isMandatory !== undefined && { isMandatory: dto.isMandatory }),
        ...(dto.practiceType !== undefined && { practiceType: dto.practiceType ?? null }),
        ...(dto.courseWorkCount !== undefined && { courseWorkCount: dto.courseWorkCount }),
        ...(dto.courseProjectCount !== undefined && { courseProjectCount: dto.courseProjectCount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.electiveBlockId !== undefined && { electiveBlockId: dto.electiveBlockId ?? null }),
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

    return this.prisma.curriculumComponent.delete({ where: { id: componentId } })
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

    return this.prisma.curriculumComponentTerm.create({
      data: {
        componentId,
        semesterNumber: dto.semesterNumber,
        ects: dto.ects,
        hours: dto.hours,
        controlForm: dto.controlForm,
        hasCourseWork: dto.hasCourseWork ?? false,
        hasCourseProject: dto.hasCourseProject ?? false,
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

    return this.prisma.curriculumComponentTerm.update({
      where: { id: termId },
      data: {
        ...(dto.ects !== undefined && { ects: dto.ects }),
        ...(dto.hours !== undefined && { hours: dto.hours }),
        ...(dto.controlForm !== undefined && { controlForm: dto.controlForm }),
        ...(dto.hasCourseWork !== undefined && { hasCourseWork: dto.hasCourseWork }),
        ...(dto.hasCourseProject !== undefined && { hasCourseProject: dto.hasCourseProject }),
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
