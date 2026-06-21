import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { CatalogStatus, SelectionMethod, SelectionStatus } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { AdminAssignDto } from './dto/admin-assign.dto'
import { AdminAssignV2Dto } from './dto/admin-assign-v2.dto'
import { AutoAssignBulkDto } from './dto/auto-assign-bulk.dto'
import { CloneElectiveCatalogDto } from './dto/clone-elective-catalog.dto'
import { CreateElectiveComponentDto } from './dto/create-elective-component.dto'
import { CreateOfferingDto } from './dto/create-offering.dto'
import { CreateSeasonDto } from './dto/create-season.dto'
import { SelectElectiveDto } from './dto/select-elective.dto'
import { StudentSelectDto } from './dto/student-select.dto'
import { UpdateCatalogStatusDto } from './dto/update-catalog-status.dto'
import { UpdateElectiveComponentDto } from './dto/update-elective-component.dto'
import { UpdateOfferingDto } from './dto/update-offering.dto'
import { UpdateSeasonStatusDto } from './dto/update-season-status.dto'

/** §3.6 — мінімальна частка групи для кворуму вибору ВК */
const QUORUM_THRESHOLD = 0.75

/** Вікна вибору, що дозволяють студенту надсилати заявку */
const OPEN_STATUSES: CatalogStatus[] = [CatalogStatus.OPEN, CatalogStatus.LATE]

/** Include для curriculumTerm — використовується в deprecated-маршрутах */
const CURRICULUM_TERM_INCLUDE = {
  curriculumTerm: {
    select: {
      id: true,
      semesterNumber: true,
      ects: true,
      hours: true,
      controlForm: true,
      component: {
        select: {
          name: true,
          lectureHours: true,
          practicalHours: true,
          labHours: true,
        },
      },
    },
  },
} as const

/** Include для ElectiveOffering — повертається студентам і адмінам у новій архітектурі */
const OFFERING_INCLUDE = {
  component: {
    select: {
      id: true,
      name: true,
      lectureHours: true,
      practicalHours: true,
      labHours: true,
      section: {
        select: {
          code: true,
          version: {
            select: {
              versionNumber: true,
              curriculum: {
                select: {
                  program: {
                    select: {
                      name: true,
                      specialty: { select: { code: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      terms: {
        select: {
          id: true,
          semesterNumber: true,
          ects: true,
          hours: true,
          controlForm: true,
        },
      },
    },
  },
} as const

@Injectable()
export class ElectivesService {
  private readonly logger = new Logger(ElectivesService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── Season management (admin) ─────────────────────────────────────

  public async getSeasons(academicYear?: string) {
    return this.prisma.electiveBlockSeason.findMany({
      where: academicYear ? { academicYear } : undefined,
      include: {
        block: {
          select: {
            id: true,
            name: true,
            semesterNumber: true,
            minSelections: true,
            maxSelections: true,
          },
        },
        _count: { select: { offerings: true, selections: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { block: { semesterNumber: 'asc' } }],
    })
  }

  public async createSeason(dto: CreateSeasonDto) {
    const block = await this.prisma.electiveBlock.findUnique({ where: { id: dto.blockId } })
    if (!block) throw new NotFoundException('ElectiveBlock не знайдено.')

    const existing = await this.prisma.electiveBlockSeason.findUnique({
      where: { blockId_academicYear: { blockId: dto.blockId, academicYear: dto.academicYear } },
    })
    if (existing) {
      throw new BadRequestException(
        `Сезон для блоку "${block.name}" і року ${dto.academicYear} вже існує.`,
      )
    }

    return this.prisma.electiveBlockSeason.create({
      data: {
        blockId: dto.blockId,
        academicYear: dto.academicYear,
        catalogStatus: CatalogStatus.DRAFT,
      },
      include: {
        block: {
          select: { id: true, name: true, semesterNumber: true, minSelections: true, maxSelections: true },
        },
        _count: { select: { offerings: true, selections: true } },
      },
    })
  }

  public async updateSeasonStatus(seasonId: string, dto: UpdateSeasonStatusDto) {
    const season = await this.prisma.electiveBlockSeason.findUnique({ where: { id: seasonId } })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    return this.prisma.electiveBlockSeason.update({
      where: { id: seasonId },
      data: { catalogStatus: dto.catalogStatus },
      include: {
        block: {
          select: { id: true, name: true, semesterNumber: true, minSelections: true, maxSelections: true },
        },
        _count: { select: { offerings: true, selections: true } },
      },
    })
  }

  public async deleteSeason(seasonId: string) {
    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: seasonId },
      include: { _count: { select: { selections: true } } },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')
    if (season.catalogStatus !== CatalogStatus.DRAFT) {
      throw new BadRequestException('Видалення дозволено лише для сезонів зі статусом DRAFT.')
    }
    if (season._count.selections > 0) {
      throw new BadRequestException('Не можна видалити сезон, у якому є вибори студентів.')
    }

    await this.prisma.electiveBlockSeason.delete({ where: { id: seasonId } })
    return { deleted: true, id: seasonId }
  }

  // ── Offering management (admin) ───────────────────────────────────

  public async getOfferingsForSeason(seasonId: string) {
    const season = await this.prisma.electiveBlockSeason.findUnique({ where: { id: seasonId } })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    return this.prisma.electiveOffering.findMany({
      where: { seasonId },
      include: OFFERING_INCLUDE,
      orderBy: { component: { name: 'asc' } },
    })
  }

  public async addOffering(seasonId: string, dto: CreateOfferingDto) {
    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: seasonId },
      include: { block: { select: { semesterNumber: true, name: true } } },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    const component = await this.prisma.curriculumComponent.findUnique({
      where: { id: dto.componentId },
      include: { terms: { select: { semesterNumber: true } } },
    })
    if (!component) throw new NotFoundException('CurriculumComponent не знайдено.')

    // Компонент повинен мати терм, семестр якого збігається з семестром блоку.
    // Без цього StudentElectiveSelection не матиме коректного академічного терму.
    const hasMatchingTerm = component.terms.some(
      t => t.semesterNumber === season.block.semesterNumber,
    )
    if (!hasMatchingTerm) {
      throw new BadRequestException(
        `Компонент «${component.name}» не має терму для ${season.block.semesterNumber} семестру ` +
          `(блок «${season.block.name}»). ` +
          `Додайте CurriculumComponentTerm з semesterNumber=${season.block.semesterNumber} у навчальному плані.`,
      )
    }

    const existing = await this.prisma.electiveOffering.findUnique({
      where: { seasonId_componentId: { seasonId, componentId: dto.componentId } },
    })
    if (existing) throw new BadRequestException('Цей варіант вже є в каталозі сезону.')

    return this.prisma.electiveOffering.create({
      data: {
        seasonId,
        componentId: dto.componentId,
        syllabusUrl: dto.syllabusUrl,
        isHigherEd: dto.isHigherEd ?? false,
        description: dto.description,
      },
      include: OFFERING_INCLUDE,
    })
  }

  public async updateOffering(offeringId: string, dto: UpdateOfferingDto) {
    const offering = await this.prisma.electiveOffering.findUnique({ where: { id: offeringId } })
    if (!offering) throw new NotFoundException('Offering не знайдено.')

    return this.prisma.electiveOffering.update({
      where: { id: offeringId },
      data: {
        syllabusUrl: dto.syllabusUrl !== undefined ? dto.syllabusUrl : offering.syllabusUrl,
        isHigherEd: dto.isHigherEd !== undefined ? dto.isHigherEd : offering.isHigherEd,
        description: dto.description !== undefined ? dto.description : offering.description,
      },
      include: OFFERING_INCLUDE,
    })
  }

  public async removeOffering(offeringId: string) {
    const offering = await this.prisma.electiveOffering.findUnique({
      where: { id: offeringId },
      include: { season: { select: { catalogStatus: true } } },
    })
    if (!offering) throw new NotFoundException('Offering не знайдено.')
    if (offering.season.catalogStatus !== CatalogStatus.DRAFT) {
      throw new BadRequestException('Видалення варіанту дозволено лише для DRAFT сезонів.')
    }

    await this.prisma.electiveOffering.delete({ where: { id: offeringId } })
    return { deleted: true, id: offeringId }
  }

  // ── Student view (new architecture) ──────────────────────────────

  /**
   * Блоки ВК для студента: повертає відкриті сезони з варіантами.
   * Фільтрується за ОПП (через CurriculumComponent → section → version → curriculum → program)
   * і навчальним роком.
   */
  public async getBlocksForStudent(oppCode: string, academicYear: string) {
    return this.prisma.electiveBlockSeason.findMany({
      where: {
        academicYear,
        catalogStatus: { not: CatalogStatus.DRAFT },
        block: {
          options: {
            some: {
              section: {
                version: {
                  curriculum: {
                    program: { specialty: { code: oppCode } },
                  },
                },
              },
            },
          },
        },
      },
      include: {
        block: {
          select: {
            id: true,
            name: true,
            semesterNumber: true,
            minSelections: true,
            maxSelections: true,
          },
        },
        offerings: {
          include: OFFERING_INCLUDE,
          orderBy: { component: { name: 'asc' } },
        },
      },
      orderBy: { block: { semesterNumber: 'asc' } },
    })
  }

  // ── Student selection (new architecture) ──────────────────────────

  public async studentSelect(studentId: string, dto: StudentSelectDto) {
    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: dto.seasonId },
      include: { block: { select: { minSelections: true, maxSelections: true } } },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    if (!OPEN_STATUSES.includes(season.catalogStatus)) {
      throw new BadRequestException('Вікно вибору ВК зараз закрите.')
    }

    const offering = await this.prisma.electiveOffering.findUnique({
      where: { seasonId_componentId: { seasonId: dto.seasonId, componentId: dto.componentId } },
    })
    if (!offering) throw new NotFoundException('Цей варіант недоступний у поточному сезоні.')

    if (offering.isHigherEd) {
      throw new ForbiddenException(
        'Цей ВК відноситься до вищої освіти і потребує дозволу директора. Зверніться до адміністрації.',
      )
    }

    const existing = await this.prisma.studentElectiveSelection.findUnique({
      where: { studentId_seasonId: { studentId, seasonId: dto.seasonId } },
    })
    if (existing && existing.status !== SelectionStatus.CANCELLED) {
      throw new BadRequestException(
        'Ви вже обрали ВК на цей семестр. Спочатку скасуйте попередній вибір.',
      )
    }

    if (existing) {
      return this.prisma.studentElectiveSelection.update({
        where: { id: existing.id },
        data: {
          componentId: dto.componentId,
          academicYear: season.academicYear,
          status: SelectionStatus.PENDING,
          method: SelectionMethod.VOLUNTARY,
          submittedAt: new Date(),
        },
        include: { season: { include: { block: true } }, component: true },
      })
    }

    return this.prisma.studentElectiveSelection.create({
      data: {
        studentId,
        seasonId: dto.seasonId,
        componentId: dto.componentId,
        academicYear: season.academicYear,
        method: SelectionMethod.VOLUNTARY,
        status: SelectionStatus.PENDING,
      },
      include: { season: { include: { block: true } }, component: true },
    })
  }

  public async studentCancelSelection(selectionId: string, studentId: string) {
    const selection = await this.prisma.studentElectiveSelection.findUnique({
      where: { id: selectionId },
      include: { season: { select: { catalogStatus: true } } },
    })
    if (!selection) throw new NotFoundException('Вибір не знайдено.')
    if (selection.studentId !== studentId) throw new ForbiddenException('Немає доступу.')
    if (selection.season.catalogStatus !== CatalogStatus.OPEN) {
      throw new BadRequestException('Скасування можливе лише під час відкритого вікна (OPEN).')
    }

    return this.prisma.studentElectiveSelection.update({
      where: { id: selectionId },
      data: { status: SelectionStatus.CANCELLED },
    })
  }

  public async getMySelectionsV2(studentId: string, academicYear?: string) {
    return this.prisma.studentElectiveSelection.findMany({
      where: {
        studentId,
        status: { not: SelectionStatus.CANCELLED },
        ...(academicYear ? { academicYear } : {}),
      },
      include: {
        season: {
          include: {
            block: {
              select: { id: true, name: true, semesterNumber: true },
            },
          },
        },
        component: {
          select: {
            id: true,
            name: true,
            terms: {
              select: { semesterNumber: true, ects: true, hours: true, controlForm: true },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })
  }

  // ── Admin selection management (new architecture) ─────────────────

  public async adminAssignV2(dto: AdminAssignV2Dto, adminUserId: string) {
    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: dto.seasonId },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    const offering = await this.prisma.electiveOffering.findUnique({
      where: { seasonId_componentId: { seasonId: dto.seasonId, componentId: dto.componentId } },
    })
    if (!offering) throw new NotFoundException('Цей варіант недоступний у поточному сезоні.')

    return this.prisma.studentElectiveSelection.upsert({
      where: { studentId_seasonId: { studentId: dto.studentId, seasonId: dto.seasonId } },
      create: {
        studentId: dto.studentId,
        seasonId: dto.seasonId,
        componentId: dto.componentId,
        academicYear: season.academicYear,
        method: SelectionMethod.ASSIGNED,
        status: SelectionStatus.CONFIRMED,
        overrideReason: dto.overrideReason,
        submittedAt: new Date(),
        confirmedAt: new Date(),
        confirmedById: adminUserId,
      },
      update: {
        componentId: dto.componentId,
        method: SelectionMethod.ASSIGNED,
        status: SelectionStatus.CONFIRMED,
        overrideReason: dto.overrideReason,
        confirmedAt: new Date(),
        confirmedById: adminUserId,
      },
      include: { season: { include: { block: true } }, component: true },
    })
  }

  public async confirmSelectionsV2(academicYear: string, adminUserId: string) {
    const confirmed = await this.prisma.studentElectiveSelection.updateMany({
      where: { academicYear, status: SelectionStatus.PENDING },
      data: {
        status: SelectionStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedById: adminUserId,
      },
    })

    this.logger.log(`[confirmSelectionsV2] Confirmed ${confirmed.count} selections for ${academicYear}`)
    return { confirmed: confirmed.count }
  }

  public async getGroupSelectionStatsV2(groupId: string, academicYear: string) {
    const students = await this.prisma.student.findMany({
      where: { groupId } as never,
      select: { id: true },
    })
    const total = students.length
    if (total === 0) return []
    const studentIds = students.map(s => s.id)

    const selections = await this.prisma.studentElectiveSelection.findMany({
      where: {
        studentId: { in: studentIds },
        academicYear,
        status: { not: SelectionStatus.CANCELLED },
      },
      include: {
        component: { select: { id: true, name: true } },
        season: { include: { block: { select: { semesterNumber: true } } } },
      },
    })

    const byComponent = new Map<
      string,
      { component: { id: string; name: string }; semesterNumber: number; count: number }
    >()
    for (const sel of selections) {
      const key = sel.componentId
      const entry = byComponent.get(key)
      if (entry) {
        entry.count++
      } else {
        byComponent.set(key, {
          component: sel.component,
          semesterNumber: sel.season.block.semesterNumber,
          count: 1,
        })
      }
    }

    return [...byComponent.values()].map(e => ({
      component: e.component,
      semesterNumber: e.semesterNumber,
      count: e.count,
      total,
      percentage: Math.round((e.count / total) * 100),
      hasQuorum: e.count / total >= QUORUM_THRESHOLD,
    }))
  }

  public async getEnrollmentListV2(seasonId: string, componentId: string) {
    const season = await this.prisma.electiveBlockSeason.findUnique({ where: { id: seasonId } })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    const selections = await this.prisma.studentElectiveSelection.findMany({
      where: {
        seasonId,
        componentId,
        status: { not: SelectionStatus.CANCELLED },
      },
      include: {
        student: { select: { id: true, personFIO: true } },
      },
      orderBy: { student: { personFIO: 'asc' } },
    })

    return selections.map((s, i) => ({
      no: i + 1,
      fullName: s.student.personFIO,
      studentId: s.student.id,
      voluntary: s.method === SelectionMethod.VOLUNTARY ? '✓' : '',
      assigned: s.method === SelectionMethod.ASSIGNED ? '✓' : '',
      status: s.status,
    }))
  }

  /**
   * Масове призначення ВК наказом для студентів, що не зробили самостійного вибору.
   *
   * §3.4 / §3.6 Положення:
   *   — auto-pick (без componentId): дозволено лише якщо найпопулярніший варіант
   *     набрав ≥75% добровільних виборів від загальної кількості студентів групи.
   *     Якщо кворум не досягнуто — 400, адмін має вирішити вручну.
   *   — explicit componentId: адмін свідомо приймає рішення незалежно від кворуму
   *     («рішення завідувача відділення» за §3.6). Логуємо, зберігаємо overrideReason.
   */
  public async autoAssignBulk(
    seasonId: string,
    dto: AutoAssignBulkDto,
    adminUserId: string,
  ): Promise<{ assigned: number; componentId: string; componentName: string }> {
    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: seasonId },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    // Спочатку отримуємо список студентів групи — потрібен для розрахунку кворуму
    const students = await this.prisma.student.findMany({
      where: { groupId: dto.groupId } as never,
      select: { id: true },
    })
    if (students.length === 0) {
      throw new NotFoundException(`Групу ${dto.groupId} не знайдено або вона порожня.`)
    }
    const groupSize = students.length

    // Визначити componentId: переданий явно або найпопулярніший VOLUNTARY у цьому сезоні
    let resolvedComponentId = dto.componentId

    if (!resolvedComponentId) {
      // §3.4: рахуємо лише добровільні вибори студентів цієї групи в цьому сезоні
      const voluntarySelections = await this.prisma.studentElectiveSelection.groupBy({
        by: ['componentId'],
        where: {
          seasonId,
          studentId: { in: students.map(s => s.id) },
          method: SelectionMethod.VOLUNTARY,
          status: { not: SelectionStatus.CANCELLED },
        },
        _count: { componentId: true },
        orderBy: { _count: { componentId: 'desc' } },
        take: 1,
      })

      if (voluntarySelections.length === 0) {
        throw new BadRequestException(
          'У цьому сезоні ще немає добровільних виборів від студентів цієї групи. ' +
            'Будь ласка, вкажіть компонент явно (componentId).',
        )
      }

      const topCount = voluntarySelections[0]._count.componentId
      const quorumRatio = topCount / groupSize

      if (quorumRatio < QUORUM_THRESHOLD) {
        const percent = Math.round(quorumRatio * 100)
        const required = Math.ceil(groupSize * QUORUM_THRESHOLD)
        throw new BadRequestException(
          `Кворум 75% не досягнуто: найпопулярніший варіант обрали ${topCount} з ${groupSize} студентів (${percent}%). ` +
            `Потрібно щонайменше ${required} добровільних виборів. ` +
            `Зверніться до §3.4 Положення або призначте компонент вручну (вкажіть componentId).`,
        )
      }

      resolvedComponentId = voluntarySelections[0].componentId
      this.logger.log(
        `[autoAssignBulk] Auto-pick: компонент ${resolvedComponentId} (${Math.round(quorumRatio * 100)}% групи ${dto.groupId}, кворум досягнуто)`,
      )
    } else {
      // Ручний вибір — адмін несе відповідальність, перевірку кворуму не виконуємо
      // Але підстава є обов'язковою: без неї silent override неприпустимий
      if (!dto.overrideReason?.trim()) {
        throw new BadRequestException(
          'При ручному призначенні (explicit componentId) поле overrideReason є обов\'язковим. ' +
            'Вкажіть номер наказу, дату або протокол рішення.',
        )
      }
      this.logger.log(
        `[autoAssignBulk] Manual override: адмін ${adminUserId} явно обрав компонент ${resolvedComponentId} для групи ${dto.groupId}, підстава: "${dto.overrideReason}"`,
      )
    }

    // Перевірити, що offering для цього компонента існує в сезоні
    const offering = await this.prisma.electiveOffering.findUnique({
      where: {
        seasonId_componentId: { seasonId, componentId: resolvedComponentId },
      },
      include: { component: { select: { name: true } } },
    })
    if (!offering) {
      throw new NotFoundException(
        `Варіант для компонента ${resolvedComponentId} не знайдено в сезоні ${seasonId}.`,
      )
    }

    // students вже отримані вище для розрахунку кворуму — не дублюємо запит
    const existing = await this.prisma.studentElectiveSelection.findMany({
      where: {
        seasonId,
        studentId: { in: students.map(s => s.id) },
        status: { not: SelectionStatus.CANCELLED },
      },
      select: { studentId: true },
    })
    const withActiveSelection = new Set(existing.map(e => e.studentId))
    const unassigned = students.filter(s => !withActiveSelection.has(s.id))

    if (unassigned.length === 0) {
      this.logger.log(`[autoAssignBulk] Всі студенти групи ${dto.groupId} вже мають вибір у сезоні ${seasonId}`)
      return { assigned: 0, componentId: resolvedComponentId, componentName: offering.component.name }
    }

    const now = new Date()

    // Upsert для кожного: якщо є CANCELLED — оновити, якщо немає — створити
    const cancelledRecords = await this.prisma.studentElectiveSelection.findMany({
      where: {
        seasonId,
        studentId: { in: unassigned.map(s => s.id) },
        status: SelectionStatus.CANCELLED,
      },
      select: { id: true, studentId: true },
    })
    const cancelledByStudentId = new Map(cancelledRecords.map(r => [r.studentId, r.id]))

    const toCreate = unassigned.filter(s => !cancelledByStudentId.has(s.id))
    const toUpdate = unassigned.filter(s => cancelledByStudentId.has(s.id))

    await this.prisma.$transaction([
      ...(toCreate.length > 0
        ? [
            this.prisma.studentElectiveSelection.createMany({
              data: toCreate.map(s => ({
                studentId: s.id,
                seasonId,
                componentId: resolvedComponentId!,
                academicYear: season.academicYear,
                method: SelectionMethod.ASSIGNED,
                status: SelectionStatus.CONFIRMED,
                overrideReason: dto.overrideReason,
                submittedAt: now,
                confirmedAt: now,
                confirmedById: adminUserId,
              })),
            }),
          ]
        : []),
      ...toUpdate.map(s =>
        this.prisma.studentElectiveSelection.update({
          where: { id: cancelledByStudentId.get(s.id)! },
          data: {
            componentId: resolvedComponentId!,
            method: SelectionMethod.ASSIGNED,
            status: SelectionStatus.CONFIRMED,
            overrideReason: dto.overrideReason,
            confirmedAt: now,
            confirmedById: adminUserId,
          },
        }),
      ),
    ])

    const assigned = unassigned.length
    this.logger.log(
      `[autoAssignBulk] Наказом призначено ${assigned} студентів групи ${dto.groupId} → компонент "${offering.component.name}" (сезон ${seasonId})`,
    )

    return { assigned, componentId: resolvedComponentId, componentName: offering.component.name }
  }

  public async getStudentsWithoutSelectionV2(groupId: string, seasonId: string) {
    const season = await this.prisma.electiveBlockSeason.findUnique({ where: { id: seasonId } })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    const students = await this.prisma.student.findMany({
      where: { groupId } as never,
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    const existing = await this.prisma.studentElectiveSelection.findMany({
      where: {
        seasonId,
        studentId: { in: students.map(s => s.id) },
        status: { not: SelectionStatus.CANCELLED },
      },
      select: { studentId: true },
    })

    const withSelection = new Set(existing.map(e => e.studentId))
    return students.filter(s => !withSelection.has(s.id))
  }

  // ── Curriculum terms for linking (admin) ──────────────────────────

  public async getCurriculumTermsForLinking(oppCode?: string) {
    const terms = await this.prisma.curriculumComponentTerm.findMany({
      where: {
        electiveComponent: null,
        component: oppCode
          ? {
              section: {
                version: {
                  curriculum: {
                    program: { specialty: { code: oppCode } },
                  },
                },
              },
            }
          : undefined,
      },
      select: {
        id: true,
        semesterNumber: true,
        ects: true,
        hours: true,
        controlForm: true,
        component: {
          select: {
            id: true,
            name: true,
            lectureHours: true,
            practicalHours: true,
            labHours: true,
            section: {
              select: {
                version: {
                  select: {
                    versionNumber: true,
                    curriculum: {
                      select: {
                        program: {
                          select: {
                            name: true,
                            specialty: { select: { code: true, name: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ component: { name: 'asc' } }, { semesterNumber: 'asc' }],
    })
    return terms
  }

  // ── ElectiveBlocks listing (admin) ───────────────────────────────

  public async getElectiveBlocks() {
    return this.prisma.electiveBlock.findMany({
      select: {
        id: true,
        name: true,
        semesterNumber: true,
        minSelections: true,
        maxSelections: true,
        section: {
          select: {
            version: {
              select: {
                versionNumber: true,
                curriculum: {
                  select: {
                    program: {
                      select: {
                        name: true,
                        specialty: { select: { code: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        _count: { select: { options: true, seasons: true } },
      },
      orderBy: [{ section: { version: { curriculum: { program: { specialty: { code: 'asc' } } } } } }, { semesterNumber: 'asc' }],
    })
  }

  // ── CurriculumComponents available as offerings for a block ───────

  public async getComponentsForBlock(blockId: string) {
    const block = await this.prisma.electiveBlock.findUnique({
      where: { id: blockId },
      include: {
        options: {
          include: {
            terms: {
              select: { semesterNumber: true, ects: true, hours: true, controlForm: true },
            },
          },
        },
      },
    })
    if (!block) throw new NotFoundException('ElectiveBlock не знайдено.')
    return block.options
  }

  // ── Deprecated: ElectiveComponent CRUD ───────────────────────────

  /** @deprecated Використовується лише старим frontend. Перейти на Season/Offering API. */
  public async getCatalog(oppCode: string, academicYear: string) {
    return this.prisma.electiveComponent.findMany({
      where: { oppCode, academicYear, catalogStatus: { not: CatalogStatus.DRAFT } },
      include: CURRICULUM_TERM_INCLUDE,
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
    })
  }

  /** @deprecated */
  public async getAllCatalog(academicYear?: string) {
    return this.prisma.electiveComponent.findMany({
      where: academicYear ? { academicYear } : undefined,
      include: CURRICULUM_TERM_INCLUDE,
      orderBy: [{ academicYear: 'desc' }, { oppCode: 'asc' }, { semester: 'asc' }],
    })
  }

  /** @deprecated */
  public async createComponent(dto: CreateElectiveComponentDto) {
    return this.prisma.electiveComponent.create({
      data: {
        name: dto.name,
        oppCode: dto.oppCode,
        oppName: dto.oppName,
        semester: dto.semester,
        ectsCredits: dto.ectsCredits,
        cyclicComm: dto.cyclicComm,
        syllabusUrl: dto.syllabusUrl,
        academicYear: dto.academicYear,
        isHigherEd: dto.isHigherEd ?? false,
      },
      include: CURRICULUM_TERM_INCLUDE,
    })
  }

  /** @deprecated */
  public async updateComponent(id: string, dto: UpdateElectiveComponentDto) {
    const component = await this.prisma.electiveComponent.findUnique({ where: { id } })
    if (!component) throw new NotFoundException('ВК не знайдено.')

    let ectsCredits = dto.ectsCredits ?? component.ectsCredits
    let semester = dto.semester ?? component.semester

    if (dto.curriculumTermId) {
      const term = await this.prisma.curriculumComponentTerm.findUnique({
        where: { id: dto.curriculumTermId },
      })
      if (!term) throw new NotFoundException('Терм навчального плану не знайдено.')
      ectsCredits = Math.round(Number(term.ects))
      semester = term.semesterNumber
    }

    return this.prisma.electiveComponent.update({
      where: { id },
      data: {
        name: dto.name ?? component.name,
        oppCode: dto.oppCode ?? component.oppCode,
        oppName: dto.oppName ?? component.oppName,
        semester,
        ectsCredits,
        cyclicComm: dto.cyclicComm ?? component.cyclicComm,
        syllabusUrl: dto.syllabusUrl !== undefined ? dto.syllabusUrl : component.syllabusUrl,
        isHigherEd: dto.isHigherEd !== undefined ? dto.isHigherEd : component.isHigherEd,
        curriculumTermId:
          dto.curriculumTermId !== undefined ? dto.curriculumTermId : component.curriculumTermId,
      },
      include: CURRICULUM_TERM_INCLUDE,
    })
  }

  /** @deprecated */
  public async deleteComponent(id: string) {
    const component = await this.prisma.electiveComponent.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    })
    if (!component) throw new NotFoundException('ВК не знайдено.')
    if (component.catalogStatus !== CatalogStatus.DRAFT) {
      throw new BadRequestException('Видалення дозволено лише для ВК зі статусом DRAFT.')
    }
    if (component._count.registrations > 0) {
      throw new BadRequestException('Не можна видалити ВК, на який є реєстрації студентів.')
    }
    await this.prisma.electiveComponent.delete({ where: { id } })
    return { deleted: true, id }
  }

  /** @deprecated */
  public async cloneCatalog(dto: CloneElectiveCatalogDto) {
    if (dto.sourceYear === dto.targetYear) {
      throw new BadRequestException('Рік-джерело і рік-ціль не можуть співпадати.')
    }
    const source = await this.prisma.electiveComponent.findMany({
      where: { academicYear: dto.sourceYear },
    })
    if (source.length === 0) {
      throw new NotFoundException(`Каталог ВК для ${dto.sourceYear} не знайдено.`)
    }
    const targetCount = await this.prisma.electiveComponent.count({
      where: { academicYear: dto.targetYear },
    })
    if (targetCount > 0) {
      throw new BadRequestException(
        `Каталог для ${dto.targetYear} вже містить ${targetCount} записів. Видаліть їх перед клонуванням.`,
      )
    }
    const created = await this.prisma.$transaction(
      source.map(c =>
        this.prisma.electiveComponent.create({
          data: {
            name: c.name,
            oppCode: c.oppCode,
            oppName: c.oppName,
            semester: c.semester,
            ectsCredits: c.ectsCredits,
            cyclicComm: c.cyclicComm,
            syllabusUrl: c.syllabusUrl,
            academicYear: dto.targetYear,
            isHigherEd: c.isHigherEd,
            catalogStatus: CatalogStatus.DRAFT,
          },
        }),
      ),
    )
    this.logger.log(`[cloneCatalog] Cloned ${created.length} ВК from ${dto.sourceYear} → ${dto.targetYear}`)
    return { cloned: created.length, targetYear: dto.targetYear }
  }

  /** @deprecated */
  public async updateCatalogStatus(electiveId: string, dto: UpdateCatalogStatusDto) {
    const component = await this.prisma.electiveComponent.findUnique({ where: { id: electiveId } })
    if (!component) throw new NotFoundException('ВК не знайдено.')
    return this.prisma.electiveComponent.update({
      where: { id: electiveId },
      data: { catalogStatus: dto.catalogStatus },
    })
  }

  // ── Deprecated: ElectiveRegistration selection ────────────────────

  /** @deprecated */
  public async selectElective(studentId: string, dto: SelectElectiveDto) {
    const elective = await this.prisma.electiveComponent.findUnique({ where: { id: dto.electiveId } })
    if (!elective) throw new NotFoundException('ВК не знайдено.')
    if (!OPEN_STATUSES.includes(elective.catalogStatus)) {
      throw new BadRequestException('Вікно вибору ВК зараз закрите.')
    }
    if (elective.semester !== dto.semester) {
      throw new BadRequestException('Семестр не відповідає ВК.')
    }
    const existing = await this.prisma.electiveRegistration.findUnique({
      where: {
        studentId_academicYear_semester: {
          studentId,
          academicYear: dto.academicYear,
          semester: dto.semester,
        },
      },
    })
    if (existing) {
      throw new BadRequestException('Ви вже обрали ВК на цей семестр. Спочатку скасуйте попередній вибір.')
    }
    if (elective.isHigherEd) {
      throw new ForbiddenException(
        'Цей ВК відноситься до вищої освіти і потребує дозволу директора. Зверніться до адміністрації.',
      )
    }
    return this.prisma.electiveRegistration.create({
      data: {
        studentId,
        electiveId: dto.electiveId,
        academicYear: dto.academicYear,
        semester: dto.semester,
        method: SelectionMethod.VOLUNTARY,
        status: SelectionStatus.PENDING,
      },
      include: { elective: true },
    })
  }

  /** @deprecated */
  public async cancelSelection(registrationId: string, studentId: string) {
    const reg = await this.prisma.electiveRegistration.findUnique({
      where: { id: registrationId },
      include: { elective: true },
    })
    if (!reg) throw new NotFoundException('Реєстрацію не знайдено.')
    if (reg.studentId !== studentId) throw new ForbiddenException('Немає доступу.')
    if (reg.elective.catalogStatus !== CatalogStatus.OPEN) {
      throw new BadRequestException('Скасування можливе лише під час відкритого вікна вибору (OPEN).')
    }
    return this.prisma.electiveRegistration.update({
      where: { id: registrationId },
      data: { status: SelectionStatus.CANCELLED },
    })
  }

  /** @deprecated */
  public async getMySelections(studentId: string, academicYear?: string) {
    return this.prisma.electiveRegistration.findMany({
      where: {
        studentId,
        status: { not: SelectionStatus.CANCELLED },
        ...(academicYear ? { academicYear } : {}),
      },
      include: { elective: { include: CURRICULUM_TERM_INCLUDE } },
      orderBy: { submittedAt: 'desc' },
    })
  }

  // ── Deprecated: Group stats / enrollment / admin assign ───────────

  /** @deprecated */
  public async getGroupSelectionStats(groupId: string, academicYear: string) {
    const students = await this.prisma.student.findMany({
      where: { groupId } as never,
      select: { id: true },
    })
    const total = students.length
    const studentIds = students.map(s => s.id)
    if (total === 0) return []

    const registrations = await this.prisma.electiveRegistration.findMany({
      where: {
        studentId: { in: studentIds },
        academicYear,
        status: { not: SelectionStatus.CANCELLED },
      },
      include: {
        elective: { select: { id: true, name: true, semester: true, oppCode: true } },
      },
    })

    const byElective = new Map<
      string,
      { elective: (typeof registrations)[0]['elective']; count: number }
    >()
    for (const reg of registrations) {
      const entry = byElective.get(reg.electiveId)
      if (entry) {
        entry.count++
      } else {
        byElective.set(reg.electiveId, { elective: reg.elective, count: 1 })
      }
    }

    return [...byElective.values()].map(({ elective, count }) => ({
      elective,
      count,
      total,
      percentage: Math.round((count / total) * 100),
      hasQuorum: count / total >= QUORUM_THRESHOLD,
    }))
  }

  /** @deprecated */
  public async adminAssignElective(dto: AdminAssignDto, adminUserId: string) {
    const elective = await this.prisma.electiveComponent.findUnique({ where: { id: dto.electiveId } })
    if (!elective) throw new NotFoundException('ВК не знайдено.')

    await this.prisma.electiveRegistration.deleteMany({
      where: {
        studentId: dto.studentId,
        academicYear: dto.academicYear,
        semester: dto.semester,
        status: { in: [SelectionStatus.CANCELLED] },
      },
    })

    return this.prisma.electiveRegistration.upsert({
      where: {
        studentId_academicYear_semester: {
          studentId: dto.studentId,
          academicYear: dto.academicYear,
          semester: dto.semester,
        },
      },
      create: {
        studentId: dto.studentId,
        electiveId: dto.electiveId,
        academicYear: dto.academicYear,
        semester: dto.semester,
        method: SelectionMethod.ASSIGNED,
        status: SelectionStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedBy: adminUserId,
      },
      update: {
        electiveId: dto.electiveId,
        method: SelectionMethod.ASSIGNED,
        status: SelectionStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedBy: adminUserId,
      },
      include: { elective: true },
    })
  }

  /** @deprecated */
  public async confirmSelections(academicYear: string, adminUserId: string) {
    const confirmed = await this.prisma.electiveRegistration.updateMany({
      where: { academicYear, status: SelectionStatus.PENDING },
      data: { status: SelectionStatus.CONFIRMED, confirmedAt: new Date() },
    })
    this.logger.log(`[confirmSelections] Confirmed ${confirmed.count} pending registrations for ${academicYear}`)
    return { confirmed: confirmed.count, autoAssigned: 0 }
  }

  /** @deprecated */
  public async getGroupEnrollmentList(groupId: string, electiveId: string, academicYear: string) {
    const students = await this.prisma.student.findMany({
      where: { groupId } as never,
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    const registrations = await this.prisma.electiveRegistration.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        electiveId,
        academicYear,
        status: { not: SelectionStatus.CANCELLED },
      },
      select: { studentId: true, method: true, status: true },
    })

    const regMap = new Map(registrations.map(r => [r.studentId, r]))
    return students.map((s, i) => {
      const reg = regMap.get(s.id)
      return {
        no: i + 1,
        fullName: s.personFIO,
        studentId: s.id,
        voluntary: reg?.method === SelectionMethod.VOLUNTARY ? '✓' : '',
        assigned: reg?.method === SelectionMethod.ASSIGNED ? '✓' : '',
        status: reg?.status ?? null,
      }
    })
  }

  /** @deprecated */
  public async getStudentsWithoutSelection(groupId: string, semester: number, academicYear: string) {
    const students = await this.prisma.student.findMany({
      where: { groupId } as never,
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    const registrations = await this.prisma.electiveRegistration.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        semester,
        academicYear,
        status: { not: SelectionStatus.CANCELLED },
      },
      select: { studentId: true },
    })

    const withSelection = new Set(registrations.map(r => r.studentId))
    return students.filter(s => !withSelection.has(s.id))
  }

  // ── Print data: Додаток 2 (Заява на вибір ВК) ──────────────────────

  /**
   * §3.4 Положення — дані для друку Додатку 2 (заява студента на вибір ВК).
   * Повертає дані студента + список доступних ВК для вибору.
   */
  public async getAppendix2Data(studentId: string, seasonId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, personFIO: true, groupId: true },
    })
    if (!student) throw new NotFoundException('Студента не знайдено.')

    const group = student.groupId
      ? await this.prisma.group.findUnique({
          where: { id: student.groupId },
          select: { id: true, name: true },
        })
      : null

    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: seasonId },
      include: {
        block: { select: { name: true, semesterNumber: true } },
        offerings: {
          include: {
            component: {
              select: { id: true, code: true, name: true, totalEcts: true },
            },
          },
        },
      },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    const selection = await this.prisma.studentElectiveSelection.findUnique({
      where: { studentId_seasonId: { studentId, seasonId } },
      select: { componentId: true, method: true, status: true },
    })

    return {
      student: { id: student.id, fullName: student.personFIO, group: group?.name ?? '' },
      block: { name: season.block.name, semester: season.block.semesterNumber },
      academicYear: season.academicYear,
      offerings: season.offerings.map((o) => ({
        componentId: o.component.id,
        code: o.component.code,
        name: o.component.name,
        ects: o.component.totalEcts,
        syllabusUrl: o.syllabusUrl,
        isHigherEd: o.isHigherEd,
      })),
      currentSelection: selection
        ? { componentId: selection.componentId, method: selection.method, status: selection.status }
        : null,
    }
  }

  // ── Print data: Додаток 3 (Список зарахованих на ВК) ───────────────

  /**
   * §3.9 Положення — дані для друку Додатку 3.
   * Список студентів групи з вказанням способу вибору ВК (Заява | Наказ).
   */
  public async getAppendix3Data(seasonId: string, groupId: string) {
    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: seasonId },
      include: {
        block: { select: { name: true, semesterNumber: true } },
        electiveSeason: { select: { academicYear: true } },
      },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    })
    if (!group) throw new NotFoundException('Групу не знайдено.')

    const students = await this.prisma.student.findMany({
      where: { groupId } as never,
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    const selections = await this.prisma.studentElectiveSelection.findMany({
      where: {
        seasonId,
        studentId: { in: students.map((s) => s.id) },
        status: { not: SelectionStatus.CANCELLED },
      },
      include: {
        component: { select: { id: true, code: true, name: true } },
      },
    })

    const selMap = new Map(selections.map((s) => [s.studentId, s]))

    return {
      title: `Додаток 3 — Список студентів групи ${group.name}`,
      block: season.block.name,
      semester: season.block.semesterNumber,
      academicYear: season.electiveSeason?.academicYear ?? season.academicYear,
      group: group.name,
      rows: students.map((s, i) => {
        const sel = selMap.get(s.id)
        return {
          no: i + 1,
          fullName: s.personFIO,
          componentName: sel?.component.name ?? '—',
          componentCode: sel?.component.code ?? '',
          method: sel?.method ?? null,
          methodLabel: sel?.method === SelectionMethod.VOLUNTARY
            ? 'Заява'
            : sel?.method === SelectionMethod.ASSIGNED
              ? 'Наказ'
              : '—',
        }
      }),
      totalStudents: students.length,
      voluntaryCount: selections.filter((s) => s.method === SelectionMethod.VOLUNTARY).length,
      assignedCount: selections.filter((s) => s.method === SelectionMethod.ASSIGNED).length,
    }
  }

  // ── Validation: 10% threshold (ст.54 п.17 Закону 2745-VIII) ────────

  /**
   * Перевіряє, чи вибіркова частина навчального плану
   * складає ≥ 10% від загального обсягу ЄКТС.
   */
  public async validateElectiveThreshold(versionId: string) {
    const version = await this.prisma.curriculumVersion.findUnique({
      where: { id: versionId },
      include: {
        curriculum: { select: { totalEcts: true } },
        sections: {
          include: {
            components: {
              select: { totalEcts: true, isMandatory: true, electiveBlockId: true },
            },
            electiveBlocks: {
              include: {
                options: { select: { totalEcts: true } },
              },
            },
          },
        },
      },
    })
    if (!version) throw new NotFoundException('Версію навчального плану не знайдено.')

    const totalEcts = Number(version.curriculum.totalEcts)

    let electiveEcts = 0
    for (const section of version.sections) {
      if (section.sectionType === 'ELECTIVE' || section.sectionType === 'ELECTIVE_OPP') {
        for (const comp of section.components) {
          electiveEcts += Number(comp.totalEcts)
        }
      }
      for (const block of section.electiveBlocks) {
        if (block.options.length > 0) {
          const maxEcts = Math.max(...block.options.map((o) => Number(o.totalEcts)))
          electiveEcts += maxEcts
        }
      }
    }

    const percentage = totalEcts > 0 ? (electiveEcts / totalEcts) * 100 : 0
    const isValid = percentage >= 10

    return {
      versionId,
      totalEcts,
      electiveEcts: Math.round(electiveEcts * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      threshold: 10,
      isValid,
      message: isValid
        ? `Вибіркова частина (${percentage.toFixed(1)}%) відповідає вимозі ≥ 10%.`
        : `Вибіркова частина (${percentage.toFixed(1)}%) НЕ відповідає вимозі ≥ 10% (ст. 54 п. 17 Закону №2745-VIII).`,
    }
  }
}
