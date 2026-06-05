import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateWorkingAssignmentDto } from './dto/create-working-assignment.dto'
import { CreateWorkingCurriculumDto } from './dto/create-working-curriculum.dto'
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
  public constructor(private readonly prisma: PrismaService) {}

  // ── Working curriculum CRUD ───────────────────────────────────────────────

  public async findAll(versionId?: string, academicYear?: string) {
    return this.prisma.workingCurriculum.findMany({
      where: {
        ...(versionId ? { versionId } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      orderBy: [{ academicYear: 'desc' }],
      include: {
        ...WORKING_CURRICULUM_INCLUDE,
        _count: { select: { groupAssignments: true, componentTerms: true } },
      },
    })
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
          },
          orderBy: { componentTerm: { semesterNumber: 'asc' } },
        },
        groupAssignments: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
    })

    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')
    return wc
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
   * Затверджує робочий навчальний план на поточний навчальний рік.
   */
  public async approve(id: string) {
    const wc = await this.prisma.workingCurriculum.findUnique({ where: { id } })
    if (!wc) throw new NotFoundException('Робочий навчальний план не знайдено.')
    if (wc.isApproved) {
      throw new BadRequestException('Робочий план вже затверджено.')
    }

    return this.prisma.workingCurriculum.update({
      where: { id },
      data: { isApproved: true, approvedAt: new Date() },
    })
  }

  // ── Component terms (hour breakdown) ────────────────────────────────────

  /**
   * Вставляє або оновлює розбивку годин для компонент-семестру.
   *
   * Правило цілісності: сума годин за видами роботи не повинна перевищувати
   * загальну кількість годин з нормативного розподілу.
   * Якщо перевищення — кидає BadRequestException.
   */
  public async upsertComponentTerm(workingCurriculumId: string, dto: UpsertWorkingComponentTermDto) {
    const wc = await this.prisma.workingCurriculum.findUnique({ where: { id: workingCurriculumId } })
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

    const totalDistributed =
      (dto.lectureHours ?? 0) +
      (dto.practicalHours ?? 0) +
      (dto.labHours ?? 0) +
      (dto.seminarHours ?? 0) +
      (dto.independentHours ?? 0) +
      (dto.consultationHours ?? 0)

    if (totalDistributed > componentTerm.hours) {
      throw new BadRequestException(
        `Сума годин (${totalDistributed}) перевищує нормативний обсяг компонента (${componentTerm.hours} год).`,
      )
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
