import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'
import {
  NORM_CONSULTATION_RATIO_DISTANCE,
  NORM_CONSULTATION_RATIO_FULL_TIME,
} from '../teacher-load/teacher-load.constants'

import { CreateWorkingAssignmentDto } from './dto/create-working-assignment.dto'
import { CreateWorkingCurriculumDto } from './dto/create-working-curriculum.dto'
import { UpdateWorkingComponentTermDto } from './dto/update-working-component-term.dto'
import { UpdateWorkingCurriculumDto } from './dto/update-working-curriculum.dto'
import { UpsertWorkingComponentTermDto } from './dto/upsert-working-component-term.dto'

const WORKING_CURRICULUM_INCLUDE = {
  version: {
    select: {
      id: true,
      versionNumber: true,
      isPublished: true,
      curriculum: {
        select: {
          id: true,
          educationForm: true,
          admissionBasis: true,
          entryYear: true,
          program: { select: { id: true, name: true, specialty: { select: { code: true, name: true } } } },
        },
      },
    },
  },
} as const

@Injectable()
export class WorkingCurriculaService {
  private readonly logger = new Logger(WorkingCurriculaService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── Working curriculum CRUD ───────────────────────────────────────────────

  public async findAll(versionId?: string, academicYear?: string) {
    const items = await this.prisma.workingCurriculum.findMany({
      where: {
        ...(versionId ? { versionId } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      orderBy: [{ academicYear: 'desc' }],
      include: {
        ...WORKING_CURRICULUM_INCLUDE,
        _count: { select: { componentTerms: true } },
      },
    })

    if (items.length === 0) return []

    const versionIds = [...new Set(items.map((i) => i.versionId))]

    // Batch: normative group counts per version (source of truth for group membership)
    const normativeCounts = await this.prisma.groupCurriculumAssignment.groupBy({
      by: ['versionId'],
      where: { versionId: { in: versionIds }, isActive: true },
      _count: { id: true },
    })
    const normativeCountMap = new Map(normativeCounts.map((r) => [r.versionId, r._count.id]))

    // Batch: fetch which working curricula have at least one non-zero hour value
    const nonEmptyGroups = await this.prisma.workingCurriculumComponentTerm.groupBy({
      by: ['workingCurriculumId'],
      where: {
        workingCurriculumId: { in: items.map((i) => i.id) },
        OR: [
          { lectureHours: { gt: 0 } },
          { practicalHours: { gt: 0 } },
          { labHours: { gt: 0 } },
          { seminarHours: { gt: 0 } },
          { independentHours: { gt: 0 } },
          { consultationHours: { gt: 0 } },
        ],
      },
    })
    const nonEmptyIds = new Set(nonEmptyGroups.map((g) => g.workingCurriculumId))

    return items.map((item) => ({
      ...item,
      isEmpty: !nonEmptyIds.has(item.id),
      activeGroupCount: normativeCountMap.get(item.versionId) ?? 0,
    }))
  }

  public async findById(id: string) {
    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id },
      include: {
        ...WORKING_CURRICULUM_INCLUDE,
        componentTerms: {
          include: {
            componentTerm: {
              include: {
                component: { select: { id: true, code: true, name: true, componentType: true } },
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
              },
            },
          },
          orderBy: [
            { componentTerm: { component: { section: { orderIndex: 'asc' } } } },
            { componentTerm: { component: { orderIndex: 'asc' } } },
            { componentTerm: { semesterNumber: 'asc' } },
          ],
        },
      },
    })

    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    // Live group membership is derived from the normative layer, not from the snapshot table.
    // GroupWorkingCurriculumAssignment is a historical snapshot; use GroupCurriculumAssignment as source of truth.
    const activeGroups = await this.prisma.groupCurriculumAssignment.findMany({
      where: { versionId: wc.versionId, isActive: true },
      select: {
        id: true,
        group: { select: { id: true, name: true } },
        effectiveFrom: true,
      },
      orderBy: { group: { name: 'asc' } },
    })

    const isEmpty = wc.componentTerms.every(
      (t) =>
        t.lectureHours === 0 &&
        t.practicalHours === 0 &&
        t.labHours === 0 &&
        t.seminarHours === 0 &&
        t.independentHours === 0 &&
        t.consultationHours === 0,
    )

    return { ...wc, isEmpty, activeGroups }
  }

  /**
   * Створює робочий навчальний план для заданого навчального року.
   * Версія плану має бути опублікована.
   */
  public async create(dto: CreateWorkingCurriculumDto) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id: dto.versionId } })
    if (!version) throw new NotFoundException('Версію навчального плану не знайдено.')
    if (!version.isPublished) {
      throw new BadRequestException(
        'Не можна створити робочий план для неопублікованої версії.',
      )
    }

    const existing = await this.prisma.workingCurriculum.findUnique({
      where: { versionId_academicYear: { versionId: dto.versionId, academicYear: dto.academicYear } },
    })
    if (existing) {
      throw new BadRequestException(
        `Робочий план для версії та навчального року "${dto.academicYear}" вже існує.`,
      )
    }

    return this.prisma.workingCurriculum.create({
      data: {
        versionId: dto.versionId,
        academicYear: dto.academicYear,
        semesterNumbers: dto.semesterNumbers,
        notes: dto.notes ?? null,
        isApproved: false,
      },
      include: WORKING_CURRICULUM_INCLUDE,
    })
  }

  public async update(id: string, dto: UpdateWorkingCurriculumDto) {
    const wc = await this.prisma.workingCurriculum.findUnique({ where: { id } })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    return this.prisma.workingCurriculum.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    })
  }

  /**
   * Перевіряє, чи є розподіл годин робочого плану порожнім.
   *
   * Порожній план: немає жодного запису компонент-семестру АБО сума всіх
   * погодинних полів по всіх записах дорівнює нулю.
   */
  private async isEmptyById(id: string): Promise<boolean> {
    const agg = await this.prisma.workingCurriculumComponentTerm.aggregate({
      where: { workingCurriculumId: id },
      _sum: {
        lectureHours: true,
        practicalHours: true,
        labHours: true,
        seminarHours: true,
        independentHours: true,
        consultationHours: true,
      },
    })
    const total =
      (agg._sum.lectureHours ?? 0) +
      (agg._sum.practicalHours ?? 0) +
      (agg._sum.labHours ?? 0) +
      (agg._sum.seminarHours ?? 0) +
      (agg._sum.independentHours ?? 0) +
      (agg._sum.consultationHours ?? 0)
    return total === 0
  }

  /**
   * Затверджує робочий навчальний план на поточний навчальний рік.
   * Забороняє затвердження порожнього плану.
   */
  public async approve(id: string) {
    const wc = await this.prisma.workingCurriculum.findUnique({ where: { id } })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')
    if (wc.isApproved) {
      throw new BadRequestException('Робочий план вже затверджено.')
    }

    const empty = await this.isEmptyById(id)
    if (empty) {
      throw new BadRequestException(
        'Неможливо затвердити порожній робочий план. Спочатку внесіть розподіл годин для всіх компонентів.',
      )
    }

    return this.prisma.workingCurriculum.update({
      where: { id },
      data: { isApproved: true, approvedAt: new Date() },
    })
  }

  /**
   * Видаляє робочий навчальний план.
   *
   * Дозволено лише якщо:
   * - план не затверджено,
   * - немає прив'язаних груп,
   * - розподіл годин не заповнено (план порожній).
   */
  public async delete(id: string) {
    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id },
      include: { _count: { select: { groupSnapshots: true } } },
    })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    if (wc.isApproved) {
      throw new BadRequestException('Неможливо видалити затверджений робочий план.')
    }

    // Guard on both normative groups (live membership) and snapshots (historical assignments)
    const activeGroupCount = await this.prisma.groupCurriculumAssignment.count({
      where: { versionId: wc.versionId, isActive: true },
    })
    if (activeGroupCount > 0 || wc._count.groupSnapshots > 0) {
      throw new BadRequestException(
        'Неможливо видалити робочий план, до якого прив\'язані групи. Спочатку від\'яжіть групи.',
      )
    }

    const empty = await this.isEmptyById(id)
    if (!empty) {
      throw new BadRequestException(
        'Неможливо видалити робочий план із внесеним розподілом годин. Очистіть розподіл перед видаленням.',
      )
    }

    // WorkingCurriculumComponentTerm has onDelete: Cascade → terms deleted automatically
    await this.prisma.workingCurriculum.delete({ where: { id } })
  }

  // ── Component terms (hour breakdown) ────────────────────────────────────

  /**
   * Ідемпотентно ініціалізує рядки розподілу годин:
   * для кожного канонічного CurriculumComponentTerm, що входить до семестрів
   * цього робочого плану, створює WorkingCurriculumComponentTerm (якщо ще немає).
   * Наявні рядки НЕ перезаписуються.
   *
   * Безпечно викликати повторно — дублів не виникає.
   */
  public async initializeTerms(id: string) {
    const wc = await this.prisma.workingCurriculum.findUnique({ where: { id } })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')
    if (wc.isApproved) {
      throw new BadRequestException('Затверджений план не можна змінювати.')
    }

    // Знайти всі канонічні терми версії в потрібних семестрах.
    // §3.10 Положення про вибір ОК: до робочого плану входять лише ОБРАНІ ВК,
    // тому опції вибіркових блоків (electiveBlockId != null) включаються
    // тільки якщо існує підсумок вибору групи (GroupElectiveSelection)
    // в межах активної прив'язки до цієї версії плану.
    const canonicalTerms = await this.prisma.curriculumComponentTerm.findMany({
      where: {
        semesterNumber: { in: wc.semesterNumbers },
        component: {
          section: { versionId: wc.versionId },
          OR: [
            { electiveBlockId: null },
            {
              groupSelections: {
                some: { assignment: { versionId: wc.versionId, isActive: true } },
              },
            },
          ],
        },
      },
      select: { id: true },
    })

    if (canonicalTerms.length === 0) {
      throw new BadRequestException(
        'У навчальному плані немає компонентів для вибраних семестрів. Спочатку заповніть структуру плану.',
      )
    }

    // Ідемпотентне створення: пропустити ті, що вже існують
    await this.prisma.workingCurriculumComponentTerm.createMany({
      data: canonicalTerms.map((t) => ({
        workingCurriculumId: id,
        componentTermId: t.id,
        lectureHours: 0,
        practicalHours: 0,
        labHours: 0,
        seminarHours: 0,
        independentHours: 0,
        consultationHours: 0,
      })),
      skipDuplicates: true,
    })

    return this.findById(id)
  }

  /**
   * Оновлює розбивку годин для конкретного WorkingCurriculumComponentTerm за його ID.
   *
   * Дозволяє часткове оновлення (PATCH-семантика): не вказані поля залишаються без змін.
   * Сума аудиторних годин не блокує збереження: componentTerm.hours зберігає аудиторний
   * орієнтовний обсяг, а робочий план додатково розподіляє самостійну роботу та консультації,
   * тому загальна сума може перевищувати нормативний аудиторний показник. Візуальне
   * попередження про перевищення надає клієнт (поле "Залишок" та підсвітка рядка).
   */
  public async updateComponentTerm(termId: string, dto: UpdateWorkingComponentTermDto) {
    const term = await this.prisma.workingCurriculumComponentTerm.findUnique({
      where: { id: termId },
      include: {
        workingCurriculum: {
          select: {
            isApproved: true,
            version: { select: { curriculum: { select: { educationForm: true } } } },
          },
        },
        componentTerm: { select: { hours: true } },
      },
    })
    if (!term) throw new NotFoundException('Запис розподілу годин не знайдено.')
    if (term.workingCurriculum.isApproved) {
      throw new BadRequestException('Затверджений план не можна змінювати.')
    }

    const next = {
      lectureHours: dto.lectureHours ?? term.lectureHours,
      practicalHours: dto.practicalHours ?? term.practicalHours,
      labHours: dto.labHours ?? term.labHours,
      seminarHours: dto.seminarHours ?? term.seminarHours,
      independentHours: dto.independentHours ?? term.independentHours,
      consultationHours: dto.consultationHours ?? term.consultationHours,
    }

    // SOFT WARN: Наказ МОН №686 п.9 — ліміт консультацій відносно загального обсягу
    const educationForm = term.workingCurriculum.version.curriculum.educationForm
    const isDistance = educationForm === 'PART_TIME' || educationForm === 'DUAL'
    const consultRatio = isDistance ? NORM_CONSULTATION_RATIO_DISTANCE : NORM_CONSULTATION_RATIO_FULL_TIME
    const componentHours = term.componentTerm.hours
    if (componentHours > 0 && next.consultationHours > componentHours * consultRatio) {
      this.logger.warn(
        `[SOFT WARN] Консультації (${next.consultationHours} год) перевищують ${consultRatio * 100}% ` +
          `обсягу компонента (${componentHours} год). Наказ МОН №686 п.9. termId=${termId}`,
      )
    }

    return this.prisma.workingCurriculumComponentTerm.update({
      where: { id: termId },
      data: {
        ...next,
        ...(dto.weeklyLectureHours !== undefined && { weeklyLectureHours: dto.weeklyLectureHours }),
        ...(dto.weeklyPracticalHours !== undefined && { weeklyPracticalHours: dto.weeklyPracticalHours }),
        // teacherId: undefined → не змінювати; null → зняти призначення; string → призначити
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
      },
      include: {
        componentTerm: {
          include: {
            component: { select: { id: true, code: true, name: true, componentType: true } },
          },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true, middleName: true },
        },
      },
    })
  }

  /**
   * Вставляє або оновлює розбивку годин для компонент-семестру.
   *
   * componentTerm.hours — аудиторний орієнтовний обсяг; загальна сума робочого розподілу
   * може його перевищувати за рахунок самостійної роботи та консультацій.
   * Перевірка перевищення відсутня — вона є некоректною (порівняння різних величин).
   */
  public async upsertComponentTerm(workingCurriculumId: string, dto: UpsertWorkingComponentTermDto) {
    const wc = await this.prisma.workingCurriculum.findUnique({
      where: { id: workingCurriculumId },
      include: { version: { select: { curriculum: { select: { educationForm: true } } } } },
    })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')

    // Перевіряємо, що componentTerm належить до тієї ж версії плану
    const componentTerm = await this.prisma.curriculumComponentTerm.findUnique({
      where: { id: dto.componentTermId },
      include: {
        component: {
          include: { section: { select: { versionId: true } } },
        },
      },
    })
    if (!componentTerm) throw new NotFoundException('Розподіл компонента не знайдено.')
    if (componentTerm.component.section.versionId !== wc.versionId) {
      throw new BadRequestException(
        'Цей розподіл не належить до версії плану, на якій базується робочий план.',
      )
    }

    // Перевіряємо, що семестр входить у список семестрів робочого плану
    if (!wc.semesterNumbers.includes(componentTerm.semesterNumber)) {
      throw new BadRequestException(
        `Семестр ${componentTerm.semesterNumber} не входить до робочого плану цього навчального року.`,
      )
    }

    // SOFT WARN: Наказ МОН №686 п.9 — ліміт консультацій відносно загального обсягу
    const consultationHours = dto.consultationHours ?? 0
    if (consultationHours > 0 && componentTerm.hours > 0) {
      const educationForm = wc.version.curriculum.educationForm
      const isDistance = educationForm === 'PART_TIME' || educationForm === 'DUAL'
      const consultRatio = isDistance ? NORM_CONSULTATION_RATIO_DISTANCE : NORM_CONSULTATION_RATIO_FULL_TIME
      if (consultationHours > componentTerm.hours * consultRatio) {
        this.logger.warn(
          `[SOFT WARN] Консультації (${consultationHours} год) перевищують ${consultRatio * 100}% ` +
            `обсягу компонента (${componentTerm.hours} год). Наказ МОН №686 п.9. ` +
            `wcId=${workingCurriculumId} componentTermId=${dto.componentTermId}`,
        )
      }
    }

    return this.prisma.workingCurriculumComponentTerm.upsert({
      where: {
        workingCurriculumId_componentTermId: {
          workingCurriculumId,
          componentTermId: dto.componentTermId,
        },
      },
      create: {
        workingCurriculumId,
        componentTermId: dto.componentTermId,
        lectureHours: dto.lectureHours ?? 0,
        practicalHours: dto.practicalHours ?? 0,
        labHours: dto.labHours ?? 0,
        seminarHours: dto.seminarHours ?? 0,
        independentHours: dto.independentHours ?? 0,
        consultationHours: dto.consultationHours ?? 0,
        weeklyLectureHours: dto.weeklyLectureHours ?? null,
        weeklyPracticalHours: dto.weeklyPracticalHours ?? null,
        teacherId: dto.teacherId ?? null,
      },
      update: {
        lectureHours: dto.lectureHours ?? 0,
        practicalHours: dto.practicalHours ?? 0,
        labHours: dto.labHours ?? 0,
        seminarHours: dto.seminarHours ?? 0,
        independentHours: dto.independentHours ?? 0,
        consultationHours: dto.consultationHours ?? 0,
        weeklyLectureHours: dto.weeklyLectureHours ?? null,
        weeklyPracticalHours: dto.weeklyPracticalHours ?? null,
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
      },
    })
  }

  // ── Group working curriculum assignment ───────────────────────────────────

  public async findWorkingCurriculumForGroup(groupId: string, academicYear?: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new NotFoundException('Групу не знайдено.')

    return this.prisma.groupWorkingCurriculumAssignment.findMany({
      where: {
        groupId,
        ...(academicYear ? { academicYear } : {}),
      },
      orderBy: { academicYear: 'desc' },
      include: {
        workingCurriculum: { include: WORKING_CURRICULUM_INCLUDE },
        assignment: {
          select: {
            id: true,
            effectiveFrom: true,
            effectiveUntil: true,
            isActive: true,
          },
        },
      },
    })
  }

  /**
   * Призначає групу до робочого навчального плану на навчальний рік.
   *
   * Правила:
   * 1. Академічний рік робочого плану повинен збігатися з вказаним.
   * 2. Якщо є активне призначення для цього групи+рік — замінюємо.
   * 3. assignment (нормативне призначення групи) повинен бути активним.
   */
  public async createWorkingAssignment(dto: CreateWorkingAssignmentDto) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } })
    if (!group) throw new NotFoundException('Групу не знайдено.')

    const workingCurriculum = await this.prisma.workingCurriculum.findUnique({
      where: { id: dto.workingCurriculumId },
    })
    if (!workingCurriculum) throw new NotFoundException('Робочий навчальний план не знайдено.')

    const normativeAssignment = await this.prisma.groupCurriculumAssignment.findUnique({
      where: { id: dto.assignmentId },
    })
    if (!normativeAssignment) throw new NotFoundException('Нормативне призначення не знайдено.')
    if (!normativeAssignment.isActive) {
      throw new BadRequestException('Нормативне призначення групи є неактивним.')
    }
    if (normativeAssignment.groupId !== dto.groupId) {
      throw new BadRequestException('Нормативне призначення не належить до цієї групи.')
    }
    // Перевіряємо, що нормативне призначення посилається на ту саму версію плану
    if (normativeAssignment.versionId !== workingCurriculum.versionId) {
      throw new BadRequestException(
        'Нормативне призначення та робочий план посилаються на різні версії навчального плану.',
      )
    }

    // Якщо вже є призначення для цієї групи на цей рік — замінюємо
    const existing = await this.prisma.groupWorkingCurriculumAssignment.findUnique({
      where: { groupId_academicYear: { groupId: dto.groupId, academicYear: workingCurriculum.academicYear } },
    })

    if (existing) {
      return this.prisma.groupWorkingCurriculumAssignment.update({
        where: { id: existing.id },
        data: {
          workingCurriculumId: dto.workingCurriculumId,
          assignmentId: dto.assignmentId,
          isActive: true,
          assignedBy: dto.assignedBy ?? null,
        },
        include: {
          group: { select: { id: true, name: true } },
          workingCurriculum: { include: WORKING_CURRICULUM_INCLUDE },
        },
      })
    }

    return this.prisma.groupWorkingCurriculumAssignment.create({
      data: {
        groupId: dto.groupId,
        workingCurriculumId: dto.workingCurriculumId,
        assignmentId: dto.assignmentId,
        academicYear: workingCurriculum.academicYear,
        isActive: true,
        assignedBy: dto.assignedBy ?? null,
      },
      include: {
        group: { select: { id: true, name: true } },
        workingCurriculum: { include: WORKING_CURRICULUM_INCLUDE },
      },
    })
  }
}
