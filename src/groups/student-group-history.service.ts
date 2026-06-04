import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class StudentGroupHistoryService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Повертає повну хронологію переміщень студента між групами.
   * Записи впорядковані від найстарішого до найновішого.
   *
   * @param studentId — UUID студента
   * @throws NotFoundException — якщо студента не знайдено
   */
  public async getStudentTimeline(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } })
    if (!student) throw new NotFoundException('Студента не знайдено.')

    return this.prisma.studentGroupHistory.findMany({
      where: { studentId },
      include: {
        fromGroup: { select: { id: true, name: true } },
        toGroup: { select: { id: true, name: true } },
      },
      orderBy: { changedAt: 'asc' },
    })
  }

  /**
   * Повертає всіх студентів, що БУДЬ-КОЛИ були в групі.
   * Розділяє на поточних (groupId === groupId) та колишніх.
   *
   * @param groupId — UUID групи
   * @throws NotFoundException — якщо групу не знайдено
   */
  public async getAllStudentsEverInGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new NotFoundException('Групу не знайдено.')

    // Поточні студенти групи
    const current = await this.prisma.student.findMany({
      where: { groupId },
      orderBy: { personFIO: 'asc' },
      select: {
        id: true,
        personFIO: true,
        groupName: true,
        courseId: true,
        courseName: true,
        userId: true,
      },
    })

    // Колишні студенти — ті, хто фігурував у history як toGroup або fromGroup,
    // але зараз не є в поточній групі
    const currentIds = new Set(current.map((s) => s.id))

    const historyRecords = await this.prisma.studentGroupHistory.findMany({
      where: {
        OR: [
          { toGroupId: groupId },
          { fromGroupId: groupId },
        ],
      },
      select: { studentId: true },
      distinct: ['studentId'],
    })

    const formerIds = historyRecords
      .map((r) => r.studentId)
      .filter((id) => !currentIds.has(id))

    const former = await this.prisma.student.findMany({
      where: { id: { in: formerIds } },
      orderBy: { personFIO: 'asc' },
      select: {
        id: true,
        personFIO: true,
        groupName: true,
        courseId: true,
        courseName: true,
        userId: true,
      },
    })

    return { current, former }
  }
}
