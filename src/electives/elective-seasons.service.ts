import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { CatalogStatus, SelectionMethod, SelectionStatus } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { ConfirmGroupSelectionDto } from './dto/confirm-group-selection.dto'
import { CreateCampaignDto } from './dto/create-campaign.dto'
import { UpdateCampaignDto } from './dto/update-campaign.dto'
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto'

/** §3.6 — мінімальна частка групи для кворуму вибору ВК */
const QUORUM_THRESHOLD = 0.75

/**
 * Семестри навчального плану, які когорта з роком вступу entryYear
 * вивчає в навчальному році "YYYY-YYYY".
 * Курс = (стартовий рік навчального року − рік вступу) + 1.
 */
export function semestersForAcademicYear(entryYear: number, academicYear: string): number[] {
  const startYear = Number(academicYear.slice(0, 4))
  if (!Number.isInteger(startYear)) return []
  const course = startYear - entryYear + 1
  if (course < 1) return []
  return [course * 2 - 1, course * 2]
}

const CAMPAIGN_INCLUDE = {
  _count: { select: { blockSeasons: true } },
} as const

@Injectable()
export class ElectiveSeasonsService {
  private readonly logger = new Logger(ElectiveSeasonsService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── Campaign CRUD ──────────────────────────────────────────────────

  public async getCampaigns() {
    return this.prisma.electiveSeason.findMany({
      include: CAMPAIGN_INCLUDE,
      orderBy: { academicYear: 'desc' },
    })
  }

  public async getCampaign(id: string) {
    const campaign = await this.prisma.electiveSeason.findUnique({
      where: { id },
      include: {
        blockSeasons: {
          include: {
            block: {
              select: {
                id: true,
                name: true,
                semesterNumber: true,
                section: {
                  select: {
                    version: {
                      select: {
                        id: true,
                        versionNumber: true,
                        curriculum: {
                          select: {
                            entryYear: true,
                            educationForm: true,
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
            _count: { select: { offerings: true, selections: true } },
          },
          orderBy: { block: { semesterNumber: 'asc' } },
        },
      },
    })
    if (!campaign) throw new NotFoundException('Кампанію не знайдено.')
    return campaign
  }

  public async createCampaign(dto: CreateCampaignDto) {
    const existing = await this.prisma.electiveSeason.findUnique({
      where: { academicYear: dto.academicYear },
    })
    if (existing) {
      throw new BadRequestException(`Кампанія для ${dto.academicYear} вже існує.`)
    }

    return this.prisma.electiveSeason.create({
      data: {
        academicYear: dto.academicYear,
        status: CatalogStatus.DRAFT,
        selectionDeadline: dto.selectionDeadline ? new Date(dto.selectionDeadline) : undefined,
        lateDeadline: dto.lateDeadline ? new Date(dto.lateDeadline) : undefined,
        notes: dto.notes,
      },
      include: CAMPAIGN_INCLUDE,
    })
  }

  public async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.electiveSeason.findUnique({ where: { id } })
    if (!campaign) throw new NotFoundException('Кампанію не знайдено.')

    return this.prisma.electiveSeason.update({
      where: { id },
      data: {
        ...(dto.selectionDeadline !== undefined && {
          selectionDeadline: new Date(dto.selectionDeadline),
        }),
        ...(dto.lateDeadline !== undefined && { lateDeadline: new Date(dto.lateDeadline) }),
        ...(dto.pedagogicalCouncilDate !== undefined && {
          pedagogicalCouncilDate: new Date(dto.pedagogicalCouncilDate),
        }),
        ...(dto.pedagogicalCouncilProtocolNumber !== undefined && {
          pedagogicalCouncilProtocolNumber: dto.pedagogicalCouncilProtocolNumber,
        }),
        ...(dto.directorOrderNumber !== undefined && {
          directorOrderNumber: dto.directorOrderNumber,
        }),
        ...(dto.directorOrderDate !== undefined && {
          directorOrderDate: new Date(dto.directorOrderDate),
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: CAMPAIGN_INCLUDE,
    })
  }

  /**
   * Bulk-перехід статусу кампанії та всіх її block-сезонів (§3.1–3.9).
   * Публікація (DRAFT → OPEN) вимагає зафіксованого затвердження педрадою
   * та наказу директора (§2.4) — SOFT-вимога: блокуємо лише повну відсутність.
   */
  public async updateCampaignStatus(id: string, dto: UpdateCampaignStatusDto) {
    const campaign = await this.prisma.electiveSeason.findUnique({
      where: { id },
      include: { _count: { select: { blockSeasons: true } } },
    })
    if (!campaign) throw new NotFoundException('Кампанію не знайдено.')

    if (
      campaign.status === CatalogStatus.DRAFT &&
      dto.status === CatalogStatus.OPEN &&
      !campaign.pedagogicalCouncilProtocolNumber &&
      !campaign.directorOrderNumber
    ) {
      this.logger.warn(
        `[updateCampaignStatus] Кампанія ${campaign.academicYear} відкривається без реквізитів педради/наказу (§2.4)`,
      )
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.electiveSeason.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === CatalogStatus.OPEN && !campaign.publishedAt
            ? { publishedAt: new Date() }
            : {}),
        },
        include: CAMPAIGN_INCLUDE,
      }),
      this.prisma.electiveBlockSeason.updateMany({
        where: { electiveSeasonId: id },
        data: { catalogStatus: dto.status },
      }),
    ])

    this.logger.log(
      `[updateCampaignStatus] Кампанія ${campaign.academicYear}: ${campaign.status} → ${dto.status} (${campaign._count.blockSeasons} block-сезонів)`,
    )
    return updated
  }

  /**
   * Генерація block-сезонів кампанії.
   *
   * Для кожної групи з активним GroupCurriculumAssignment обчислюється,
   * які семестри плану її когорта вивчатиме в цільовому навчальному році,
   * і для всіх ElectiveBlock цих семестрів відповідної версії створюються
   * ElectiveBlockSeason (ідемпотентно). Існуючі сезони того ж року без
   * прив'язки до кампанії — приймаються в кампанію.
   */
  public async generateBlockSeasons(id: string) {
    const campaign = await this.prisma.electiveSeason.findUnique({ where: { id } })
    if (!campaign) throw new NotFoundException('Кампанію не знайдено.')

    const assignments = await this.prisma.groupCurriculumAssignment.findMany({
      where: { isActive: true, effectiveUntil: null },
      select: {
        versionId: true,
        group: { select: { name: true } },
        version: { select: { versionNumber: true } },
        curriculum: {
          select: {
            entryYear: true,
            studyDurationMonths: true,
            program: { select: { name: true } },
          },
        },
      },
    })

    if (assignments.length === 0) {
      throw new BadRequestException(
        'Немає активних прив\'язок груп до навчальних планів. ' +
          'Спочатку призначте групам навчальні плани.',
      )
    }

    // Усі слоти ВК у системі — для діагностики розривів «версія/семестр»
    const allBlocks = await this.prisma.electiveBlock.findMany({
      select: { id: true, semesterNumber: true, section: { select: { versionId: true } } },
    })
    const blockSemestersByVersion = new Map<string, number[]>()
    for (const b of allBlocks) {
      const list = blockSemestersByVersion.get(b.section.versionId) ?? []
      list.push(b.semesterNumber)
      blockSemestersByVersion.set(b.section.versionId, list)
    }

    // versionId → семестри, які хоч одна когорта вивчатиме в цільовому році,
    // + попередження для груп, чий ланцюжок «версія → блок → семестр» рветься
    const warnings: string[] = []
    const semestersByVersion = new Map<string, Set<number>>()
    for (const a of assignments) {
      const semesters = semestersForAcademicYear(a.curriculum.entryYear, campaign.academicYear)
      const maxSemester = Math.ceil(a.curriculum.studyDurationMonths / 6)
      const valid = semesters.filter(s => s >= 1 && s <= maxSemester)
      const label = `Група ${a.group.name} («${a.curriculum.program.name}», v${a.version.versionNumber})`

      if (valid.length === 0) {
        warnings.push(
          `${label}: у ${campaign.academicYear} році когорта ${a.curriculum.entryYear} року вступу не навчається (семестри поза межами плану).`,
        )
        continue
      }

      const versionBlockSemesters = blockSemestersByVersion.get(a.versionId)
      if (!versionBlockSemesters || versionBlockSemesters.length === 0) {
        warnings.push(
          `${label}: у цій версії плану немає жодного блоку ВК. Якщо блоки створені в іншій версії — перепризначте групу на неї.`,
        )
        continue
      }
      if (!versionBlockSemesters.some(s => valid.includes(s))) {
        warnings.push(
          `${label}: блоки ВК у версії існують у семестрах [${[...new Set(versionBlockSemesters)].sort((x, y) => x - y).join(', ')}], ` +
            `але в ${campaign.academicYear} році група вивчає семестри [${valid.join(', ')}]. ` +
            `Релевантна кампанія для цих блоків — інший навчальний рік.`,
        )
        continue
      }

      const set = semestersByVersion.get(a.versionId) ?? new Set<number>()
      valid.forEach(s => set.add(s))
      semestersByVersion.set(a.versionId, set)
    }

    const blocks =
      semestersByVersion.size === 0
        ? []
        : await this.prisma.electiveBlock.findMany({
            where: {
              OR: [...semestersByVersion.entries()].map(([versionId, semesters]) => ({
                section: { versionId },
                semesterNumber: { in: [...semesters] },
              })),
            },
            select: { id: true },
          })

    const existing = await this.prisma.electiveBlockSeason.findMany({
      where: { academicYear: campaign.academicYear },
      select: { id: true, blockId: true, electiveSeasonId: true },
    })
    const existingByBlock = new Map(existing.map(s => [s.blockId, s]))

    const toCreate = blocks.filter(b => !existingByBlock.has(b.id))
    const toAdopt = blocks
      .map(b => existingByBlock.get(b.id))
      .filter((s): s is NonNullable<typeof s> => !!s && s.electiveSeasonId === null)

    await this.prisma.$transaction([
      ...(toCreate.length > 0
        ? [
            this.prisma.electiveBlockSeason.createMany({
              data: toCreate.map(b => ({
                blockId: b.id,
                academicYear: campaign.academicYear,
                catalogStatus: campaign.status,
                electiveSeasonId: id,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
      ...(toAdopt.length > 0
        ? [
            this.prisma.electiveBlockSeason.updateMany({
              where: { id: { in: toAdopt.map(s => s.id) } },
              data: { electiveSeasonId: id },
            }),
          ]
        : []),
    ])

    this.logger.log(
      `[generateBlockSeasons] Кампанія ${campaign.academicYear}: створено ${toCreate.length}, прийнято ${toAdopt.length}, всього блоків ${blocks.length}, попереджень ${warnings.length}`,
    )
    return {
      created: toCreate.length,
      adopted: toAdopt.length,
      totalRelevantBlocks: blocks.length,
      /** Діагностика розривів «група → версія → блок → семестр» */
      warnings,
    }
  }

  // ── Student: blocks resolved via group assignment ──────────────────

  /**
   * Каталог ВК для студента, визначений через прив'язку його групи
   * до версії навчального плану (а не через код ОПП).
   * Повертаються лише блоки тих семестрів, які когорта студента
   * вивчатиме в цільовому навчальному році.
   */
  public async getMyBlocks(studentId: string, academicYear: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, groupId: true },
    })
    if (!student?.groupId) return []

    const assignment = await this.prisma.groupCurriculumAssignment.findFirst({
      where: { groupId: student.groupId, isActive: true, effectiveUntil: null },
      select: {
        versionId: true,
        curriculum: { select: { entryYear: true, studyDurationMonths: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    })
    if (!assignment) return []

    const semesters = semestersForAcademicYear(
      assignment.curriculum.entryYear,
      academicYear,
    ).filter(s => s <= Math.ceil(assignment.curriculum.studyDurationMonths / 6))
    if (semesters.length === 0) return []

    return this.prisma.electiveBlockSeason.findMany({
      where: {
        academicYear,
        catalogStatus: { not: CatalogStatus.DRAFT },
        block: {
          semesterNumber: { in: semesters },
          section: { versionId: assignment.versionId },
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
          include: {
            component: {
              select: {
                id: true,
                name: true,
                lectureHours: true,
                practicalHours: true,
                labHours: true,
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
          },
          orderBy: { component: { name: 'asc' } },
        },
      },
      orderBy: { block: { semesterNumber: 'asc' } },
    })
  }

  // ── Group outcome: confirm + propagate to working curriculum ──────

  /**
   * Фіксація підсумку вибору групи в межах block-сезону (§3.6, §3.9):
   *  1) визначає переможний компонент (кворум ≥75% або явне рішення з наказом);
   *  2) створює/оновлює GroupElectiveSelection — з цього моменту ВК
   *     обов'язковий для групи;
   *  3) підтверджує добровільні вибори переможного компонента,
   *     допризначає студентів без вибору (метод ASSIGNED);
   *  4) пропагує обраний компонент у робочий навчальний план (§3.10).
   */
  public async confirmGroupSelection(
    seasonId: string,
    groupId: string,
    dto: ConfirmGroupSelectionDto,
    adminUserId: string,
  ) {
    const season = await this.prisma.electiveBlockSeason.findUnique({
      where: { id: seasonId },
      include: { block: { select: { id: true, name: true, semesterNumber: true, sectionId: true, section: { select: { versionId: true } } } } },
    })
    if (!season) throw new NotFoundException('Сезон не знайдено.')

    const assignment = await this.prisma.groupCurriculumAssignment.findFirst({
      where: { groupId, isActive: true, effectiveUntil: null },
      orderBy: { effectiveFrom: 'desc' },
    })
    if (!assignment) {
      throw new BadRequestException('Група не має активної прив\'язки до навчального плану.')
    }
    if (assignment.versionId !== season.block.section.versionId) {
      throw new BadRequestException(
        'Блок ВК належить іншій версії навчального плану, ніж активна прив\'язка групи.',
      )
    }

    const students = await this.prisma.student.findMany({
      where: { groupId },
      select: { id: true },
    })
    if (students.length === 0) {
      throw new BadRequestException('У групі немає студентів.')
    }
    const studentIds = students.map(s => s.id)
    const groupSize = students.length

    // Добровільні вибори групи в цьому сезоні
    const voluntary = await this.prisma.studentElectiveSelection.groupBy({
      by: ['componentId'],
      where: {
        seasonId,
        studentId: { in: studentIds },
        method: SelectionMethod.VOLUNTARY,
        status: { not: SelectionStatus.CANCELLED },
      },
      _count: { componentId: true },
      orderBy: { _count: { componentId: 'desc' } },
    })

    let componentId = dto.componentId
    let quorumReached = false

    if (voluntary.length > 0) {
      const top = voluntary[0]
      quorumReached = top._count.componentId / groupSize >= QUORUM_THRESHOLD
      if (!componentId) {
        if (!quorumReached) {
          const percent = Math.round((top._count.componentId / groupSize) * 100)
          throw new BadRequestException(
            `Кворум 75% не досягнуто (${percent}%). Вкажіть componentId та реквізити наказу (§3.4, §3.7).`,
          )
        }
        componentId = top.componentId
      } else if (componentId !== top.componentId || !quorumReached) {
        quorumReached = false
      }
    }

    if (!componentId) {
      throw new BadRequestException(
        'У групі немає добровільних виборів. Вкажіть componentId та реквізити наказу (§3.4).',
      )
    }

    // §3.4: без кворуму підсумок фіксується лише наказом
    if (!quorumReached && !dto.orderNumber?.trim()) {
      throw new BadRequestException(
        'Кворум заявами не досягнуто — обов\'язково вкажіть номер наказу (orderNumber), §3.4 Положення.',
      )
    }

    const offering = await this.prisma.electiveOffering.findUnique({
      where: { seasonId_componentId: { seasonId, componentId } },
      include: { component: { select: { id: true, name: true } } },
    })
    if (!offering) {
      throw new NotFoundException('Обраний компонент відсутній у каталозі цього сезону.')
    }

    const now = new Date()

    // Стан виборів студентів групи в сезоні
    const selections = await this.prisma.studentElectiveSelection.findMany({
      where: {
        seasonId,
        studentId: { in: studentIds },
        status: { not: SelectionStatus.CANCELLED },
      },
      select: { id: true, studentId: true, componentId: true, status: true },
    })
    const selectedStudentIds = new Set(selections.map(s => s.studentId))
    const winnersPending = selections.filter(
      s => s.componentId === componentId && s.status === SelectionStatus.PENDING,
    )
    const dissenters = selections.filter(s => s.componentId !== componentId)
    const withoutSelection = students.filter(s => !selectedStudentIds.has(s.id))

    // Скасовані записи студентів без активного вибору → оновлюємо, не створюємо дубль
    const cancelled = await this.prisma.studentElectiveSelection.findMany({
      where: {
        seasonId,
        studentId: { in: withoutSelection.map(s => s.id) },
        status: SelectionStatus.CANCELLED,
      },
      select: { id: true, studentId: true },
    })
    const cancelledByStudent = new Map(cancelled.map(c => [c.studentId, c.id]))
    const toCreate = withoutSelection.filter(s => !cancelledByStudent.has(s.id))
    const toRevive = withoutSelection.filter(s => cancelledByStudent.has(s.id))

    await this.prisma.$transaction([
      // 1) Підсумок групи — ВК стає обов'язковим (§3.9)
      this.prisma.groupElectiveSelection.upsert({
        where: {
          blockId_assignmentId: { blockId: season.block.id, assignmentId: assignment.id },
        },
        create: {
          blockId: season.block.id,
          componentId,
          assignmentId: assignment.id,
          seasonId,
          orderNumber: dto.orderNumber,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
          selectedBy: adminUserId,
        },
        update: {
          componentId,
          seasonId,
          orderNumber: dto.orderNumber,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
          selectedBy: adminUserId,
          selectedAt: now,
        },
      }),
      // 2) Підтвердити добровільні вибори переможного компонента
      ...(winnersPending.length > 0
        ? [
            this.prisma.studentElectiveSelection.updateMany({
              where: { id: { in: winnersPending.map(s => s.id) } },
              data: {
                status: SelectionStatus.CONFIRMED,
                confirmedAt: now,
                confirmedById: adminUserId,
              },
            }),
          ]
        : []),
      // 3) Допризначити студентів без вибору (§3.4 — наказ)
      ...(toCreate.length > 0
        ? [
            this.prisma.studentElectiveSelection.createMany({
              data: toCreate.map(s => ({
                studentId: s.id,
                seasonId,
                componentId,
                academicYear: season.academicYear,
                method: SelectionMethod.ASSIGNED,
                status: SelectionStatus.CONFIRMED,
                overrideReason: dto.orderNumber
                  ? `Наказ №${dto.orderNumber}`
                  : 'Призначено за підсумком вибору групи (§3.4)',
                submittedAt: now,
                confirmedAt: now,
                confirmedById: adminUserId,
              })),
            }),
          ]
        : []),
      ...toRevive.map(s =>
        this.prisma.studentElectiveSelection.update({
          where: { id: cancelledByStudent.get(s.id)! },
          data: {
            componentId: componentId!,
            method: SelectionMethod.ASSIGNED,
            status: SelectionStatus.CONFIRMED,
            overrideReason: dto.orderNumber
              ? `Наказ №${dto.orderNumber}`
              : 'Призначено за підсумком вибору групи (§3.4)',
            confirmedAt: now,
            confirmedById: adminUserId,
          },
        }),
      ),
    ])

    // 4) §3.10 — пропагація в робочий навчальний план
    const propagation = await this.propagateToWorkingCurriculum(
      assignment.versionId,
      season.academicYear,
      componentId,
      season.block.semesterNumber,
    )

    this.logger.log(
      `[confirmGroupSelection] Група ${groupId}, сезон ${seasonId}: «${offering.component.name}» ` +
        `(кворум: ${quorumReached}, наказ: ${dto.orderNumber ?? '—'}), ` +
        `підтверджено ${winnersPending.length}, допризначено ${toCreate.length + toRevive.length}, ` +
        `розбіжних виборів: ${dissenters.length}`,
    )

    return {
      componentId,
      componentName: offering.component.name,
      quorumReached,
      confirmedVoluntary: winnersPending.length,
      assignedByOrder: toCreate.length + toRevive.length,
      /** Студенти, що обрали інший компонент — потребують ручного рішення (§3.7) */
      dissenting: dissenters.length,
      workingCurriculum: propagation,
    }
  }

  /**
   * §3.10 — додає терм обраного ВК у відповідний робочий навчальний план
   * (якщо РНП існує, не затверджений і охоплює семестр блоку). Ідемпотентно.
   */
  private async propagateToWorkingCurriculum(
    versionId: string,
    academicYear: string,
    componentId: string,
    semesterNumber: number,
  ): Promise<{ status: 'ADDED' | 'ALREADY_PRESENT' | 'NO_WORKING_CURRICULUM' | 'APPROVED_LOCKED' | 'SEMESTER_NOT_COVERED' }> {
    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { versionId_academicYear: { versionId, academicYear } },
    })
    if (!wc) return { status: 'NO_WORKING_CURRICULUM' }
    if (wc.isApproved) return { status: 'APPROVED_LOCKED' }
    if (!wc.semesterNumbers.includes(semesterNumber)) return { status: 'SEMESTER_NOT_COVERED' }

    const term = await this.prisma.curriculumComponentTerm.findUnique({
      where: { componentId_semesterNumber: { componentId, semesterNumber } },
    })
    if (!term) return { status: 'NO_WORKING_CURRICULUM' }

    const result = await this.prisma.workingCurriculumComponentTerm.createMany({
      data: [
        {
          workingCurriculumId: wc.id,
          componentTermId: term.id,
          lectureHours: 0,
          practicalHours: 0,
          labHours: 0,
          seminarHours: 0,
          independentHours: 0,
          consultationHours: 0,
        },
      ],
      skipDuplicates: true,
    })
    return { status: result.count > 0 ? 'ADDED' : 'ALREADY_PRESENT' }
  }

  // ── Campaign progress (admin dashboard) ───────────────────────────

  /**
   * Зведення по кампанії: для кожної релевантної групи та кожного її
   * block-сезону — кількість виборів, кворум, зафіксований підсумок.
   */
  public async getCampaignProgress(id: string) {
    const campaign = await this.prisma.electiveSeason.findUnique({
      where: { id },
      include: {
        blockSeasons: {
          include: {
            block: {
              select: {
                id: true,
                name: true,
                semesterNumber: true,
                section: { select: { versionId: true } },
              },
            },
          },
        },
      },
    })
    if (!campaign) throw new NotFoundException('Кампанію не знайдено.')

    const assignments = await this.prisma.groupCurriculumAssignment.findMany({
      where: { isActive: true, effectiveUntil: null },
      select: {
        id: true,
        versionId: true,
        groupId: true,
        group: { select: { id: true, name: true, _count: { select: { students: true } } } },
        curriculum: { select: { entryYear: true, studyDurationMonths: true } },
      },
    })

    const seasonIds = campaign.blockSeasons.map(s => s.id)
    const groupOutcomes = await this.prisma.groupElectiveSelection.findMany({
      where: { seasonId: { in: seasonIds } },
      select: {
        seasonId: true,
        assignmentId: true,
        componentId: true,
        orderNumber: true,
        component: { select: { name: true } },
      },
    })
    const outcomeKey = (seasonId: string, assignmentId: string) => `${seasonId}:${assignmentId}`
    const outcomeMap = new Map(
      groupOutcomes.map(o => [outcomeKey(o.seasonId ?? '', o.assignmentId), o]),
    )

    const rows: Array<{
      group: { id: string; name: string; studentCount: number }
      season: { id: string; blockName: string; semesterNumber: number; catalogStatus: CatalogStatus }
      voluntaryCount: number
      topComponent: { id: string; name: string; count: number } | null
      quorumReached: boolean
      outcome: { componentId: string; componentName: string; orderNumber: string | null } | null
    }> = []

    for (const a of assignments) {
      const semesters = new Set(
        semestersForAcademicYear(a.curriculum.entryYear, campaign.academicYear).filter(
          s => s <= Math.ceil(a.curriculum.studyDurationMonths / 6),
        ),
      )
      const relevantSeasons = campaign.blockSeasons.filter(
        s => s.block.section.versionId === a.versionId && semesters.has(s.block.semesterNumber),
      )
      if (relevantSeasons.length === 0) continue

      const students = await this.prisma.student.findMany({
        where: { groupId: a.groupId },
        select: { id: true },
      })
      const studentIds = students.map(s => s.id)
      const groupSize = studentIds.length

      for (const s of relevantSeasons) {
        const grouped = groupSize
          ? await this.prisma.studentElectiveSelection.groupBy({
              by: ['componentId'],
              where: {
                seasonId: s.id,
                studentId: { in: studentIds },
                method: SelectionMethod.VOLUNTARY,
                status: { not: SelectionStatus.CANCELLED },
              },
              _count: { componentId: true },
              orderBy: { _count: { componentId: 'desc' } },
            })
          : []

        const voluntaryCount = grouped.reduce((sum, g) => sum + g._count.componentId, 0)
        let topComponent: { id: string; name: string; count: number } | null = null
        if (grouped.length > 0) {
          const top = grouped[0]
          const comp = await this.prisma.curriculumComponent.findUnique({
            where: { id: top.componentId },
            select: { id: true, name: true },
          })
          if (comp) topComponent = { ...comp, count: top._count.componentId }
        }

        const outcome = outcomeMap.get(outcomeKey(s.id, a.id))
        rows.push({
          group: { id: a.group.id, name: a.group.name, studentCount: groupSize },
          season: {
            id: s.id,
            blockName: s.block.name,
            semesterNumber: s.block.semesterNumber,
            catalogStatus: s.catalogStatus,
          },
          voluntaryCount,
          topComponent,
          quorumReached: !!topComponent && groupSize > 0 && topComponent.count / groupSize >= QUORUM_THRESHOLD,
          outcome: outcome
            ? {
                componentId: outcome.componentId,
                componentName: outcome.component.name,
                orderNumber: outcome.orderNumber,
              }
            : null,
        })
      }
    }

    return {
      campaign: {
        id: campaign.id,
        academicYear: campaign.academicYear,
        status: campaign.status,
      },
      rows,
    }
  }
}
