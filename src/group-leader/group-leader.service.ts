import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import * as XLSX from 'xlsx'

import { PrismaService } from '@/prisma/prisma.service'
import { UpdateParentInfoDto } from './dto/update-parent-info.dto'

const STUDENT_SELECT = {
  id: true,
  personFIO: true,
  birthday: true,
  corporateEmail: true,
  courseName: true,
  groupName: true,
  educationFormName: true,
  personEducationPaymentTypeName: true,
  fullSpecialityName: true,
  parentInfo: true,
} as const

@Injectable()
export class GroupLeaderService {
  private readonly logger = new Logger(GroupLeaderService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── My groups ──────────────────────────────────────────────────────────────

  /** Groups where the current user is curator (via Teacher profile). */
  public async getMyGroups(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!teacher) return []

    const groups = await this.prisma.group.findMany({
      where: { curatorId: teacher.id },
      select: {
        id: true,
        name: true,
        _count: { select: { students: true } },
        students: {
          take: 1,
          select: { fullSpecialityName: true, courseName: true, educationFormName: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      studentCount: g._count.students,
      speciality: g.students[0]?.fullSpecialityName ?? null,
      courseName: g.students[0]?.courseName ?? null,
      educationForm: g.students[0]?.educationFormName ?? null,
    }))
  }

  // ── Students list ──────────────────────────────────────────────────────────

  public async getGroupStudents(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        _count: { select: { students: true } },
        students: {
          select: STUDENT_SELECT,
          orderBy: { personFIO: 'asc' },
        },
      },
    })

    if (!group) throw new NotFoundException('Групу не знайдено.')

    return {
      id: group.id,
      name: group.name,
      studentCount: group._count.students,
      students: group.students.map(s => ({
        id: s.id,
        fullName: s.personFIO,
        email: s.corporateEmail,
        birthday: s.birthday,
        courseName: s.courseName,
        groupName: s.groupName,
        educationFormName: s.educationFormName,
        personEducationPaymentTypeName: s.personEducationPaymentTypeName,
        hasParentInfo: !!s.parentInfo,
        parentInfo: s.parentInfo,
      })),
    }
  }

  // ── Single student ─────────────────────────────────────────────────────────

  public async getStudent(groupId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, groupId },
      select: STUDENT_SELECT,
    })

    if (!student) throw new NotFoundException('Студента не знайдено в цій групі.')

    return {
      id: student.id,
      fullName: student.personFIO,
      email: student.corporateEmail,
      birthday: student.birthday,
      courseName: student.courseName,
      groupName: student.groupName,
      educationFormName: student.educationFormName,
      personEducationPaymentTypeName: student.personEducationPaymentTypeName,
      hasParentInfo: !!student.parentInfo,
      parentInfo: student.parentInfo,
    }
  }

  // ── Parent info upsert ─────────────────────────────────────────────────────

  public async upsertParentInfo(
    groupId: string,
    studentId: string,
    dto: UpdateParentInfoDto,
    userId: string,
    req: Request,
  ) {
    // Confirm student belongs to group
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, groupId },
      select: { id: true },
    })
    if (!student) throw new NotFoundException('Студента не знайдено в цій групі.')

    const info = await this.prisma.parentInfo.upsert({
      where: { studentId },
      create: { studentId, updatedById: userId, ...dto },
      update: { updatedById: userId, ...dto },
    })

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PARENT_INFO',
        targetId: studentId,
        targetType: 'Student',
        ipAddress: req.ip ?? null,
        metadata: { groupId },
      },
    })

    this.logger.log(`[ParentInfo] userId=${userId} updated studentId=${studentId}`)
    return info
  }

  // ── Admin: parent info without groupId constraint ──────────────────────────

  public async getParentInfoAdmin(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, parentInfo: true },
    })
    if (!student) throw new NotFoundException('Студента не знайдено.')
    return student.parentInfo
  }

  public async upsertParentInfoAdmin(
    studentId: string,
    dto: UpdateParentInfoDto,
    userId: string,
    req: Request,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    })
    if (!student) throw new NotFoundException('Студента не знайдено.')

    const info = await this.prisma.parentInfo.upsert({
      where: { studentId },
      create: { studentId, updatedById: userId, ...dto },
      update: { updatedById: userId, ...dto },
    })

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PARENT_INFO',
        targetId: studentId,
        targetType: 'Student',
        ipAddress: req.ip ?? null,
        metadata: { source: 'admin' },
      },
    })

    this.logger.log(`[ParentInfo/admin] userId=${userId} updated studentId=${studentId}`)
    return info
  }

  // ── Excel export ───────────────────────────────────────────────────────────

  public async exportGroupExcel(groupId: string): Promise<Buffer> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        name: true,
        students: {
          select: {
            personFIO: true,
            birthday: true,
            parentInfo: true,
          },
          orderBy: { personFIO: 'asc' },
        },
      },
    })

    if (!group) throw new NotFoundException('Групу не знайдено.')

    const rows = group.students.map((s, i) => ({
      '№': i + 1,
      'ПІБ': s.personFIO,
      'Дата народження': s.birthday ? s.birthday.toLocaleDateString('uk-UA') : '',
      'ПІБ матері': s.parentInfo?.motherFullName ?? '',
      'Тел. матері': s.parentInfo?.motherPhone ?? '',
      'Місце роботи матері': s.parentInfo?.motherWorkplace ?? '',
      'ПІБ батька': s.parentInfo?.fatherFullName ?? '',
      'Тел. батька': s.parentInfo?.fatherPhone ?? '',
      'Місце роботи батька': s.parentInfo?.fatherWorkplace ?? '',
      'ПІБ опікуна': s.parentInfo?.guardianFullName ?? '',
      'Тел. опікуна': s.parentInfo?.guardianPhone ?? '',
      'Ступінь спорідненості': s.parentInfo?.guardianRelation ?? '',
      'Адреса': s.parentInfo?.address ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, group.name.slice(0, 31))

    // Set column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 28 },
      { wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 35 },
    ]

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer)
  }
}
