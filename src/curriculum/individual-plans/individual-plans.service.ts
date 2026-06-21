import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { IndividualPlanDeviationType, SelectionMethod, SelectionStatus } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateIndividualPlanDto } from './dto/create-individual-plan.dto'
import { CreatePlanItemDto } from './dto/create-plan-item.dto'
import { UpdatePlanItemDto } from './dto/update-plan-item.dto'

const PLAN_INCLUDE = {
  student: { select: { id: true, personFIO: true } },
  assignment: {
    select: {
      id: true,
      groupId: true,
      group: { select: { id: true, name: true } },
      curriculum: { select: { id: true, totalEcts: true } },
      version: { select: { id: true, versionNumber: true } },
    },
  },
  items: {
    include: {
      component: { select: { id: true, code: true, name: true, totalEcts: true } },
    },
    orderBy: { semesterNumber: 'asc' as const },
  },
} as const

@Injectable()
export class IndividualPlansService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findByStudent(studentId: string) {
    return this.prisma.studentIndividualPlan.findUnique({
      where: { studentId },
      include: PLAN_INCLUDE,
    })
  }

  public async findByGroup(groupId: string) {
    return this.prisma.studentIndividualPlan.findMany({
      where: {
        assignment: { groupId },
      },
      include: PLAN_INCLUDE,
      orderBy: { student: { personFIO: 'asc' } },
    })
  }

  /**
   * Створити ІНП для студента.
   * Автоматично додає items типу ELECTIVE_SELECTION
   * з підтверджених виборів ВК студента.
   */
  public async create(dto: CreateIndividualPlanDto, approvedBy: string) {
    const existing = await this.prisma.studentIndividualPlan.findUnique({
      where: { studentId: dto.studentId },
    })
    if (existing) {
      throw new BadRequestException('Студент вже має індивідуальний навчальний план.')
    }

    const assignment = await this.prisma.groupCurriculumAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: {
        group: { select: { id: true } },
      },
    })
    if (!assignment) throw new NotFoundException('Призначення групи до плану не знайдено.')

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    })
    if (!student) throw new NotFoundException('Студента не знайдено.')

    const confirmedSelections = await this.prisma.studentElectiveSelection.findMany({
      where: {
        studentId: dto.studentId,
        status: SelectionStatus.CONFIRMED,
      },
      include: {
        component: { select: { id: true, name: true } },
        season: { select: { block: { select: { semesterNumber: true } } } },
      },
    })

    return this.prisma.studentIndividualPlan.create({
      data: {
        studentId: dto.studentId,
        assignmentId: dto.assignmentId,
        notes: dto.notes,
        approvedBy,
        approvedAt: new Date(),
        items: {
          create: confirmedSelections.map((sel) => ({
            componentId: sel.componentId,
            semesterNumber: sel.season.block.semesterNumber,
            deviationType: IndividualPlanDeviationType.ELECTIVE_SELECTION,
            notes: sel.method === SelectionMethod.ASSIGNED
              ? 'Призначено наказом'
              : 'Обрано студентом',
          })),
        },
      },
      include: PLAN_INCLUDE,
    })
  }

  /**
   * Масове створення ІНП для всіх студентів групи.
   * §3.11 Положення: індивідуальні плани формуються до 1 червня.
   */
  public async generateForGroup(groupId: string, assignmentId: string, approvedBy: string) {
    const assignment = await this.prisma.groupCurriculumAssignment.findUnique({
      where: { id: assignmentId },
    })
    if (!assignment) throw new NotFoundException('Призначення групи до плану не знайдено.')

    const students = await this.prisma.student.findMany({
      where: { groupId } as never,
      select: { id: true },
    })

    const existingPlans = await this.prisma.studentIndividualPlan.findMany({
      where: { studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true },
    })
    const existingSet = new Set(existingPlans.map((p) => p.studentId))
    const studentsWithoutPlan = students.filter((s) => !existingSet.has(s.id))

    let created = 0
    for (const student of studentsWithoutPlan) {
      await this.create(
        { studentId: student.id, assignmentId },
        approvedBy,
      )
      created++
    }

    return { created, skipped: existingSet.size, total: students.length }
  }

  public async addItem(planId: string, dto: CreatePlanItemDto) {
    const plan = await this.prisma.studentIndividualPlan.findUnique({
      where: { id: planId },
    })
    if (!plan) throw new NotFoundException('ІНП не знайдено.')

    return this.prisma.studentIndividualPlanItem.create({
      data: {
        planId,
        componentId: dto.componentId,
        semesterNumber: dto.semesterNumber,
        deviationType: dto.deviationType,
        notes: dto.notes,
      },
      include: {
        component: { select: { id: true, code: true, name: true, totalEcts: true } },
      },
    })
  }

  public async updateItem(itemId: string, dto: UpdatePlanItemDto) {
    const item = await this.prisma.studentIndividualPlanItem.findUnique({
      where: { id: itemId },
    })
    if (!item) throw new NotFoundException('Запис ІНП не знайдено.')

    return this.prisma.studentIndividualPlanItem.update({
      where: { id: itemId },
      data: {
        ...(dto.deviationType !== undefined && { deviationType: dto.deviationType }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        component: { select: { id: true, code: true, name: true, totalEcts: true } },
      },
    })
  }

  public async removeItem(itemId: string) {
    const item = await this.prisma.studentIndividualPlanItem.findUnique({
      where: { id: itemId },
    })
    if (!item) throw new NotFoundException('Запис ІНП не знайдено.')

    return this.prisma.studentIndividualPlanItem.delete({
      where: { id: itemId },
    })
  }

  public async approve(planId: string, approvedBy: string) {
    const plan = await this.prisma.studentIndividualPlan.findUnique({
      where: { id: planId },
    })
    if (!plan) throw new NotFoundException('ІНП не знайдено.')

    return this.prisma.studentIndividualPlan.update({
      where: { id: planId },
      data: { approvedAt: new Date(), approvedBy },
      include: PLAN_INCLUDE,
    })
  }

  public async delete(planId: string) {
    const plan = await this.prisma.studentIndividualPlan.findUnique({
      where: { id: planId },
    })
    if (!plan) throw new NotFoundException('ІНП не знайдено.')

    return this.prisma.studentIndividualPlan.delete({
      where: { id: planId },
    })
  }
}
