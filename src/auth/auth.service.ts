import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { User, UserRole } from '@prisma/client'
import { hash, verify } from 'argon2'
import { Request, Response } from 'express'

import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'
import { MailService } from '@/libs/mail/mail.service'
import { EdboService } from '@/edbo/core/edbo.service'

import { LoginDto } from './dto/login.dto'
import { RegisterStudentDto } from './dto/register-student.dto'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'
import { UserEntity } from '@/user/entities/user.entity'
import { StudentProfileEntity } from './entities/student-profile.entity'

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly edboService: EdboService
  ) {}

  /**
   * Logs in a user.
   * If two-factor authentication is enabled, sends a code to the email.
   * @param req - The Express request object.
   * @param dto - The user login data (email, password, optional 2FA code).
   * @returns The user or a message about the need for a 2FA code.
   * @throws NotFoundException if the user is not found.
   * @throws UnauthorizedException if the password is incorrect or account is deactivated.
   */
  public async login(req: Request, dto: LoginDto): Promise<{ message: string } | { user: UserEntity }> {
    const user = await this.userService.findByEmail(dto.email!)

    if (!user || !user.password) {
      throw new NotFoundException(
        'Користувача не знайдено. Будь ласка, перевірте введені дані.'
      )
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Ваш акаунт деактивовано. Зверніться до адміністратора.'
      )
    }

    const isValidPassword = await verify(user.password, dto.password!)

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Невірний пароль. Будь ласка, спробуйте ще раз або відновіть пароль.'
      )
    }

    if (user.isTwoFactorEnabled) {
      if (!dto.code) {
        await this.twoFactorAuthService.sendTwoFactorToken(user.email)

        return {
          message:
            'Перевірте вашу поштову адресу. Потрібен код двофакторної аутентифікації.'
        }
      }

      await this.twoFactorAuthService.validateTwoFactorToken(user.email, dto.code)
    }

    return this.saveSession(req, user)
  }

  /**
   * Registers a new student.
   * Verifies identity via ЄДЕБО data, creates User + Student records.
   * @param req - The Express request object.
   * @param dto - The student registration data from the sign-up form.
   * @returns An object with the created user after session save.
   * @throws BadRequestException if consent is not given.
   * @throws BadRequestException if document data is insufficient for identification.
   * @throws ConflictException if a user with this email already exists.
   * @throws NotFoundException if the student is not found in ЄДЕБО records.
   */
  public async register_student(req: Request, dto: RegisterStudentDto): Promise<{ user: UserEntity }> {
    // 1. Перевірка згоди на обробку персональних даних
    if (!dto.consent) {
      throw new BadRequestException(
        'Необхідно надати згоду на обробку персональних даних.'
      )
    }

    // 2. Перевірка унікальності email
    const existingUser = await this.userService.findByEmail(dto.email)
    if (existingUser) {
      throw new ConflictException(
        'Користувач з такою email-адресою вже зареєстрований.'
      )
    }

    // 3. Пошук студента в ЄДЕБО через наявні документи
    const edeboResult = await this.findStudentInEdebo(dto)

    // 4. Перевірка: чи студент вже прив'язаний до акаунту
    const alreadyLinked = await this.prisma.student.findFirst({
      where: {
        personId: edeboResult.student.personId,
        universityId: edeboResult.student.universityId,
        NOT: { userId: null }
      }
    })

    if (alreadyLinked) {
      throw new ConflictException(
        'Цей студент вже має зареєстрований акаунт в системі.'
      )
    }

    // 5. Хешування пароля
    const hashedPassword = await hash(dto.password)

    // 6. Створення User + синхронізація/прив'язка Student в одній транзакції
    const userId = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: 'STUDENT'
        }
      })

      // Синхронізуємо дані студента з ЄДЕБО (або оновлюємо наявного)
      const studentData = this.mapEdboStudentData(edeboResult.student, dto, edeboResult.documents)

      let studentRecord = await tx.student.findFirst({
        where: {
          personId: edeboResult.student.personId,
          universityId: edeboResult.student.universityId || this.configService.getOrThrow<number>('EDEBO_CODE')
        }
      })

      if (studentRecord) {
        // Оновлюємо наявного студента
        await tx.student.update({
          where: { id: studentRecord.id },
          data: {
            ...studentData,
            userId: createdUser.id,
            id: undefined // Не включаємо id в оновлення
          }
        })
      } else {
        // Створюємо нового студента
        await tx.student.create({
          data: {
            ...studentData,
            userId: createdUser.id
          }
        })
      }

      return createdUser.id
    })

    // 7. Отримуємо повного користувача з student даними та збереження сесії
    const user = await this.userService.findById(userId)
    return this.saveSession(req, user as any)
  }

  /**
   * Finds a student in ЄДЕБО by available documents.
   * Priority: RNOKPP → student ticket → passport.
   * First checks local database, then queries ЄДЕБО API.
   * @param dto - The registration DTO with document fields.
   * @returns The found Student record from ЄДЕБО with documents.
   * @throws BadRequestException if no identification document is provided.
   * @throws NotFoundException if student is not found in ЄДЕБО.
   */
  private async findStudentInEdebo(dto: RegisterStudentDto) {
    const universityId = this.configService.getOrThrow<number>('EDEBO_CODE')

    // Варіант 1: пошук по РНОКПП (найбільш надійний)
    if (!dto.no_rnokpp && dto.rnokpp) {
      // Спочатку перевіряємо локальну БД
      const localStudent = await this.prisma.student.findFirst({
        where: {
          rnokpp: dto.rnokpp,
          userId: null
        }
      })
      if (localStudent) {
        return { student: localStudent, documents: [] }
      }

      // Якщо не знайшли локально, шукаємо в ЄДЕБО API
      const edeboResult = await this.edboService.findStudentByRnokpp(dto.rnokpp, universityId)
      if (edeboResult) {
        return edeboResult
      }
    }

    // Варіант 2: пошук по студентському квитку
    if (!dto.no_student_ticket && dto.serial_ticket && dto.number_ticket) {
      const localStudent = await this.prisma.student.findFirst({
        where: {
          studentTicketSeries: dto.serial_ticket,
          studentTicketNumbers: dto.number_ticket,
          userId: null
        }
      })
      if (localStudent) {
        return { student: localStudent, documents: [] }
      }

      const edeboResult = await this.edboService.findStudentByTicket(
        dto.serial_ticket,
        dto.number_ticket,
        universityId
      )
      if (edeboResult) {
        return edeboResult
      }
    }

    // Варіант 3: пошук по паспорту (fallback)
    if (dto.serial_passport && dto.number_passport) {
      const localStudent = await this.prisma.student.findFirst({
        where: {
          passportSeries: dto.serial_passport,
          passportNumbers: dto.number_passport,
          userId: null
        }
      })
      if (localStudent) {
        return { student: localStudent, documents: [] }
      }

      const edeboResult = await this.edboService.findStudentByPassport(
        dto.serial_passport,
        dto.number_passport,
        universityId
      )
      if (edeboResult) {
        return edeboResult
      }
    }

    // Жодного документа не вказано
    throw new BadRequestException(
      'Необхідно вказати хоча б один ідентифікаційний документ для верифікації.'
    )
  }

  /**
   * Маппує дані студента з ЄДЕБО відповіді до формату Student моделі Prisma.
   * Витягує документи з ЄДЕБО та збереженого DTO.
   *
   * @param edeboStudent - Дані про студента з ЄДЕБО API
   * @param dto - DTO з документами від користувача
   * @param edeboDocuments - Документи з ЄДЕБО API
   * @returns Об'єкт для Prisma Student create/update
   */
  private mapEdboStudentData(edeboStudent: any, dto: RegisterStudentDto, edeboDocuments: any[] = []) {
    // Витягуємо номери документів з ЄДЕБО
    const rnokppDoc = edeboDocuments.find(d => d.idPersonDocumentType === 5) // РНОКПП
    const ticketDoc = edeboDocuments.find(d => d.idPersonDocumentType === 16) // Студентський квиток
    const passportDoc = edeboDocuments.find(d => d.idPersonDocumentType === 36) // Паспорт

    return {
      personId: edeboStudent.personId,
      universityId: edeboStudent.universityId || this.configService.getOrThrow<number>('EDEBO_CODE'),
      educationId: edeboStudent.educationId,
      personCodeU: edeboStudent.personCodeU,
      educationHistoryActualId: edeboStudent.educationHistoryActualId,
      dateBegin: edeboStudent.dateBegin ? new Date(edeboStudent.dateBegin) : null,
      dateEnd: edeboStudent.dateEnd ? new Date(edeboStudent.dateEnd) : null,
      historyTypeId: edeboStudent.historyTypeId,
      personFIO: edeboStudent.personFIO,
      birthday: edeboStudent.birthday ? new Date(edeboStudent.birthday) : null,
      personSexName: edeboStudent.personSexName,
      licenseYear: edeboStudent.licenseYear,
      educationDateBegin: edeboStudent.educationDateBegin ? new Date(edeboStudent.educationDateBegin) : null,
      educationDateEnd: edeboStudent.educationDateEnd ? new Date(edeboStudent.educationDateEnd) : null,
      facultyName: edeboStudent.facultyName,
      qualificationGroupId: edeboStudent.qualificationGroupId,
      qualificationGroupName: edeboStudent.qualificationGroupName,
      educationFormId: edeboStudent.educationFormId,
      educationFormName: edeboStudent.educationFormName,
      isDualForm: edeboStudent.isDualForm,
      isSecondHigher: edeboStudent.isSecondHigher,
      isShortTerm: edeboStudent.isShortTerm,
      fullSpecialityName: edeboStudent.fullSpecialityName,
      universityStudyProgramId: edeboStudent.universityStudyProgramId,
      studyProgramName: edeboStudent.studyProgramName,
      professionInfo: edeboStudent.professionInfo,
      courseId: edeboStudent.courseId,
      courseName: edeboStudent.courseName,
      groupName: edeboStudent.groupName,
      expelEducationTypeName: edeboStudent.expelEducationTypeName,
      academicLeaveTypeName: edeboStudent.academicLeaveTypeName,
      modifyDate: edeboStudent.modifyDate ? new Date(edeboStudent.modifyDate) : null,
      foreignTypeId: edeboStudent.foreignTypeId,
      foreignTypeName: edeboStudent.foreignTypeName,
      budgetTransferCategoryId: edeboStudent.budgetTransferCategoryId,
      budgetTransferCategoryName: edeboStudent.budgetTransferCategoryName,
      isForPhdRenewal: edeboStudent.isForPhdRenewal,

      // Документи для верифікації
      rnokpp: rnokppDoc?.documentNumbers || (dto.no_rnokpp ? '' : (dto.rnokpp ?? '')),
      studentTicketSeries: ticketDoc?.documentSeries || (dto.no_student_ticket ? '' : (dto.serial_ticket ?? '')),
      studentTicketNumbers: ticketDoc?.documentNumbers || (dto.no_student_ticket ? '' : (dto.number_ticket ?? '')),
      passportSeries: passportDoc?.documentSeries || (dto.serial_passport ?? ''),
      passportNumbers: passportDoc?.documentNumbers || (dto.number_passport ?? ''),
      passportDocumentSeries: dto.no_student_ticket ? (dto.serial_passport ?? '') : (dto.serial_ticket ?? ''),
      passportDocumentNumbers: dto.no_student_ticket ? (dto.number_passport ?? '') : (dto.number_ticket ?? '')
    }
  }

  /**
   * Terminates the user's session.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @returns A promise that resolves after the session is terminated.
   * @throws InternalServerErrorException if there was a problem terminating the session.
   */
  public async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              'Не вдалося завершити сесію. Спробуйте ще раз.'
            )
          )
        }
        res.clearCookie(this.configService.getOrThrow('SESSION_NAME'))
        resolve()
      })
    })
  }

  /**
   * Returns the profile of the current user.
   * For STUDENT role returns extended academic and personal data;
   * for all other roles returns the base profile.
   * @param userId - The authenticated user's ID.
   * @returns UserEntity or StudentProfileEntity depending on role.
   */
  public async getProfile(userId: string): Promise<UserEntity | StudentProfileEntity> {
    const user = await this.userService.findById(userId)

    if (user.role !== UserRole.STUDENT) {
      return new UserEntity(user)
    }

    const studentUser = await this.userService.findByIdWithStudentProfile(userId)
    return new StudentProfileEntity(studentUser)
  }

  /**
   * Saves the user's session.
   * @param req - The Express request object.
   * @param user - The user object.
   * @returns A promise that resolves with the user after saving the session.
   * @throws InternalServerErrorException if there was a problem saving the session.
   */
  public async saveSession(req: Request, user: User): Promise<{ user: UserEntity }> {
    return new Promise<{ user: UserEntity }>((resolve, reject) => {
      req.session.userId = user.id

      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err)
          return reject(
            new InternalServerErrorException(
              'Не вдалося зберегти сесію. Будь ласка, перевірте налаштування сесії.'
            )
          )
        }
        resolve({ user: new UserEntity(user) })
      })
    })
  }
}