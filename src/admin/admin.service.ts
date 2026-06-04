import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { randomBytes } from 'crypto'

import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'

import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto'

/**
 * Сервіс для управління користувачами адміністратором.
 */
@Injectable()
export class AdminService {
  /**
   * Конструктор сервісу адміністратора.
   * @param userService - Сервіс для роботи з користувачами.
   * @param mailService - Сервіс для відправки email-повідомлень.
   */
  public constructor(
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Повертає список всіх користувачів.
   * @returns Список користувачів.
   */
  public async findAll() {
    return this.userService.findAll()
  }

  /**
   * Повертає користувача за ID.
   * @param id - ID користувача.
   * @returns Знайдений користувач.
   * @throws NotFoundException - Якщо користувача не знайдено.
   */
  public async findById(id: string) {
    return this.userService.findById(id)
  }

  /**
   * Створює нового користувача.
   * Генерує тимчасовий пароль і відправляє його на email.
   * @param dto - Дані для створення користувача.
   * @returns Створений користувач.
   * @throws ConflictException - Якщо користувач з таким email вже існує.
   */
  public async create(dto: CreateUserDto) {
    const existingUser = await this.userService.findByEmail(dto.email)

    if (existingUser) {
      throw new ConflictException('Користувач з таким Email вже існує.')
    }

    if (dto.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } })
      if (!student) throw new BadRequestException('Студента не знайдено.')
      if (student.userId) throw new ConflictException('Цей студент вже прив\'язаний до іншого акаунту.')
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({ where: { id: dto.teacherId } })
      if (!teacher) throw new BadRequestException('Викладача не знайдено.')
      if (teacher.userId) throw new ConflictException('Цей викладач вже прив\'язаний до іншого акаунту.')
    }

    const tempPassword = randomBytes(8).toString('hex')
    const user = await this.userService.create(dto.email, tempPassword, dto.role)

    if (dto.role === UserRole.STUDENT && dto.studentId) {
      await this.prisma.student.update({ where: { id: dto.studentId }, data: { userId: user.id } })
    }

    if (dto.teacherId) {
      await this.prisma.teacher.update({ where: { id: dto.teacherId }, data: { userId: user.id } })
    }

    await this.mailService.sendTempPassword(user.email, tempPassword)

    return user
  }

  public async findUnlinkedStudents() {
    return this.prisma.student.findMany({
      where: { userId: null },
      select: { id: true, personFIO: true, groupName: true, courseName: true },
      orderBy: { personFIO: 'asc' },
    })
  }

  public async findUnlinkedTeachers() {
    return this.prisma.teacher.findMany({
      where: { userId: null },
      select: { id: true, lastName: true, firstName: true, middleName: true, positionName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  }

  /**
   * Оновлює дані користувача.
   * @param id - ID користувача.
   * @param dto - Дані для оновлення користувача.
   * @returns Оновлений користувач.
   */
  public async update(id: string, dto: UpdateUserByAdminDto) {
    await this.userService.findById(id)

    return this.userService.updateByAdmin(id, dto)
  }

  /**
   * Деактивує користувача.
   * @param id - ID користувача.
   * @returns Деактивований користувач.
   */
  public async deactivate(id: string) {
    await this.userService.findById(id)

    return this.userService.updateByAdmin(id, { isActive: false })
  }
}