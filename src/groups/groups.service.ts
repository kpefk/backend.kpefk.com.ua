import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { GroupChangeReason } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { AssignCuratorDto } from './dto/assign-curator.dto'

// ── Типи ─────────────────────────────────────────────────────────

/** Мінімальний зріз студента, необхідний для syncFromStudents */
export interface StudentSyncSnapshot {
  id: string
  educationId: number
  groupName: string | null
  groupId: string | null
}

/** Запис для розрахунку евристики зміни групи */
interface ChangedStudentEntry {
  id: string
  fromGroupId: string | null
  fromGroupName: string | null
  toGroupName: string
}

// ── Спільні select ────────────────────────────────────────────────

/** Select куратора для всіх запитів */
const CURATOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  middleName: true,
  positionName: true,
} as const

// ── Агрегація метаданих ───────────────────────────────────────────

/**
 * Агрегує метадані групи зі студентів за groupName.
 * Беремо першого (за датою створення) студента як представника групи.
 * Кількість студентів рахується через відношення Group.students.
 */
async function buildGroupMeta(
  prisma: PrismaService,
  groupName: string,
): Promise<{
  course: number | null
  courseId: number | null
  facultyName: string | null
  educationFormName: string | null
  educationFormId: number | null
  qualificationGroupName: string | null
  fullSpecialityName: string | null
  studyProgramName: string | null
  studentsCount: number
  modifyDate: Date | null
}> {
  const [representative, studentsCount] = await Promise.all([
    prisma.student.findFirst({
      where: { groupName },
      select: {
        courseId: true,
        facultyName: true,
        educationFormId: true,
        educationFormName: true,
        qualificationGroupName: true,
        fullSpecialityName: true,
        studyProgramName: true,
        modifyDate: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.student.count({ where: { groupName } }),
  ])

  return {
    course: representative?.courseId ?? null,
    courseId: representative?.courseId ?? null,
    facultyName: representative?.facultyName ?? null,
    educationFormName: representative?.educationFormName ?? null,
    educationFormId: representative?.educationFormId ?? null,
    qualificationGroupName: representative?.qualificationGroupName ?? null,
    fullSpecialityName: representative?.fullSpecialityName ?? null,
    studyProgramName: representative?.studyProgramName ?? null,
    studentsCount,
    modifyDate: representative?.modifyDate ?? null,
  }
}

// ── Сервіс ────────────────────────────────────────────────────────

@Injectable()
export class GroupsService {
  public constructor(private readonly prisma: PrismaService) {}

  // ── Публічні методи читання ───────────────────────────────────

  /**
   * Повертає всі групи з агрегованими метаданими зі студентів.
   * Метадані (курс, форма, спеціальність) беруться від першого студента групи.
   */
  public async findAll() {
    const groups = await this.prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        curator: { select: CURATOR_SELECT },
        _count: { select: { students: true } },
      },
    })

    const enriched = await Promise.all(
      groups.map(async (group) => {
        const meta = await buildGroupMeta(this.prisma, group.name)
        const { _count, ...rest } = group
        return {
          ...rest,
          ...meta,
          studentsCount: _count.students,
        }
      }),
    )

    return enriched
  }

  /**
   * Повертає одну групу з повними метаданими та списком студентів.
   * @throws NotFoundException — якщо групу не знайдено
   */
  public async findById(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        curator: { select: CURATOR_SELECT },
        students: {
          orderBy: { personFIO: 'asc' },
          select: {
            id: true,
            personFIO: true,
            groupName: true,
            courseId: true,
            courseName: true,
            userId: true,
          },
        },
        _count: { select: { students: true } },
      },
    })

    if (!group) throw new NotFoundException('Групу не знайдено.')

    const meta = await buildGroupMeta(this.prisma, group.name)
    const { _count, ...rest } = group
    return { ...rest, ...meta, studentsCount: _count.students }
  }

  // ── Куратор ───────────────────────────────────────────────────

  /**
   * Призначає куратора групи.
   * Один викладач може бути куратором лише однієї групи одночасно.
   * @throws NotFoundException — групу або викладача не знайдено
   * @throws BadRequestException — викладач вже є куратором іншої групи
   */
  public async assignCurator(id: string, dto: AssignCuratorDto) {
    const group = await this.prisma.group.findUnique({ where: { id } })
    if (!group) throw new NotFoundException('Групу не знайдено.')

    if (dto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({ where: { id: dto.teacherId } })
      if (!teacher) throw new BadRequestException('Викладача не знайдено.')

      const existingGroup = await this.prisma.group.findUnique({
        where: { curatorId: dto.teacherId },
      })
      if (existingGroup && existingGroup.id !== id) {
        throw new BadRequestException(
          `Цей викладач вже є куратором групи "${existingGroup.name}". Спочатку зніміть його з тієї групи.`,
        )
      }
    }

    const updated = await this.prisma.group.update({
      where: { id },
      data: { curatorId: dto.teacherId ?? null },
      include: { curator: { select: CURATOR_SELECT } },
    })

    const meta = await buildGroupMeta(this.prisma, updated.name)
    return { ...updated, ...meta }
  }

  // ── Трансфери ─────────────────────────────────────────────────

  /**
   * Повертає записи StudentGroupHistory для студентів,
   * що ПРИЙШЛИ до групи через TRANSFER.
   */
  public async getIncomingTransfers(groupId: string) {
    return this.prisma.studentGroupHistory.findMany({
      where: { toGroupId: groupId, reason: GroupChangeReason.TRANSFER },
      include: {
        student: { select: { id: true, personFIO: true, groupName: true } },
        fromGroup: { select: { id: true, name: true } },
      },
      orderBy: { changedAt: 'desc' },
    })
  }

  /**
   * Повертає записи StudentGroupHistory для студентів,
   * що ПІШЛИ з групи через TRANSFER.
   */
  public async getOutgoingTransfers(groupId: string) {
    return this.prisma.studentGroupHistory.findMany({
      where: { fromGroupId: groupId, reason: GroupChangeReason.TRANSFER },
      include: {
        student: { select: { id: true, personFIO: true, groupName: true } },
        toGroup: { select: { id: true, name: true } },
      },
      orderBy: { changedAt: 'desc' },
    })
  }

  // ── Синхронізація груп ────────────────────────────────────────

  /**
   * Синхронізує групи та відстежує переміщення студентів між ними.
   *
   * Алгоритм:
   * 1. Збирає унікальні groupName зі snapshot
   * 2. Upsert груп (update: {} — curatorId не перезаписується)
   * 3. Для кожного студента, у якого groupName змінився:
   *    a. Визначає reason через евристику
   *    b. Оновлює student.groupId
   *    c. Створює запис StudentGroupHistory
   *
   * @param students — знімок студентів після upsert у EdboSyncService
   * @returns Статистика: кількість нових груп та переміщень
   */
  public async syncFromStudents(
    students: StudentSyncSnapshot[],
  ): Promise<{ created: number; total: number; moves: number }> {
    // ── 1. Upsert груп ────────────────────────────────────────────
    const uniqueNames = [
      ...new Set(
        students
          .map((s) => s.groupName)
          .filter((n): n is string => n !== null && n.trim() !== ''),
      ),
    ]

    let created = 0
    const groupByName = new Map<string, string>() // name → id

    for (const name of uniqueNames) {
      const group = await this.prisma.group.upsert({
        where: { name },
        create: { name },
        update: {}, // curatorId не перезаписується
      })
      groupByName.set(name, group.id)
      if (!group.id) created++ // upsert завжди повертає запис; відстежуємо новостворені
    }

    // Рахуємо нові групи точніше — порівнюємо з тим що було
    const existingGroupIds = new Set(
      (await this.prisma.group.findMany({ select: { id: true } })).map((g) => g.id),
    )

    // ── 2. Визначаємо студентів зі зміненою групою ────────────────
    const changedStudents: ChangedStudentEntry[] = []

    for (const student of students) {
      if (!student.groupName) continue

      const newGroupId = groupByName.get(student.groupName)
      if (!newGroupId) continue

      // Якщо groupId вже збігається — нічого не змінилось
      if (student.groupId === newGroupId) continue

      // Знаходимо назву старої групи (для евристики)
      let fromGroupName: string | null = null
      if (student.groupId) {
        const oldGroup = await this.prisma.group.findUnique({
          where: { id: student.groupId },
          select: { name: true },
        })
        fromGroupName = oldGroup?.name ?? null
      }

      changedStudents.push({
        id: student.id,
        fromGroupId: student.groupId,
        fromGroupName,
        toGroupName: student.groupName,
      })
    }

    if (changedStudents.length === 0) {
      return { created, total: uniqueNames.length, moves: 0 }
    }

    // ── 3. Евристика причини переміщення ─────────────────────────
    // Знімок: скільки студентів було у кожній старій групі ДО цієї sync
    const oldGroupSnapshot = new Map<string, number>()
    for (const s of changedStudents) {
      if (s.fromGroupName) {
        oldGroupSnapshot.set(
          s.fromGroupName,
          (oldGroupSnapshot.get(s.fromGroupName) ?? 0) + 1,
        )
      }
    }

    const reasonByStudent = this.detectChangeReason(changedStudents, oldGroupSnapshot)

    // ── 4. Оновлюємо studentId та записуємо history ───────────────
    let moves = 0

    for (const entry of changedStudents) {
      const toGroupId = groupByName.get(entry.toGroupName)
      if (!toGroupId) continue

      const reason = reasonByStudent.get(entry.id) ?? GroupChangeReason.EDEBO_SYNC

      await this.prisma.student.update({
        where: { id: entry.id },
        data: { groupId: toGroupId },
      })

      await this.prisma.studentGroupHistory.create({
        data: {
          studentId: entry.id,
          fromGroupId: entry.fromGroupId,
          toGroupId,
          reason,
        },
      })

      moves++
    }

    return { created, total: uniqueNames.length, moves }
  }

  // ── Евристика ─────────────────────────────────────────────────

  /**
   * Визначає причину переміщення студента між групами.
   *
   * Логіка:
   * Для кожної старої групи рахуємо:
   *   — totalInOldGroup: скільки студентів мали цю групу до синхронізації
   *   — movedTogether: скільки з них перейшли в ОДНУ й ту саму нову групу
   *
   * Якщо movedTogether / totalInOldGroup >= 0.75 → COURSE_PROMOTION (масове переведення)
   * Якщо старої групи не було (null) → EDEBO_SYNC (перше призначення)
   * Інакше → TRANSFER (індивідуальне переведення)
   *
   * @param changedStudents — студенти зі зміненою групою
   * @param oldGroupSnapshot — Map<fromGroupName, totalCount>
   * @returns Map<studentId, GroupChangeReason>
   */
  private detectChangeReason(
    changedStudents: ChangedStudentEntry[],
    oldGroupSnapshot: Map<string, number>,
  ): Map<string, GroupChangeReason> {
    const result = new Map<string, GroupChangeReason>()

    // Для кожної старої групи рахуємо розподіл потоків: fromGroupName → toGroupName → count
    const flowCount = new Map<string, Map<string, number>>()

    for (const s of changedStudents) {
      if (!s.fromGroupName) continue
      if (!flowCount.has(s.fromGroupName)) {
        flowCount.set(s.fromGroupName, new Map())
      }
      const destinations = flowCount.get(s.fromGroupName)!
      destinations.set(s.toGroupName, (destinations.get(s.toGroupName) ?? 0) + 1)
    }

    for (const student of changedStudents) {
      // Нове призначення (раніше групи не було)
      if (!student.fromGroupName) {
        result.set(student.id, GroupChangeReason.EDEBO_SYNC)
        continue
      }

      const totalInOldGroup = oldGroupSnapshot.get(student.fromGroupName) ?? 0
      const destinations = flowCount.get(student.fromGroupName)

      if (destinations && totalInOldGroup > 0) {
        // Найбільший потік з цієї старої групи
        const maxFlow = Math.max(...destinations.values())
        const ratio = maxFlow / totalInOldGroup

        if (ratio >= 0.75) {
          result.set(student.id, GroupChangeReason.COURSE_PROMOTION)
          continue
        }
      }

      result.set(student.id, GroupChangeReason.TRANSFER)
    }

    return result
  }
}
