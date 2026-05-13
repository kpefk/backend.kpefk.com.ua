import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { TokenType } from '@prisma/client'
import { hash } from 'argon2'
import { v4 as uuidv4 } from 'uuid'

import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'

import { NewPasswordDto } from './dto/new-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

/**
 * Сервіс для управління відновленням паролю.
 */
@Injectable()
export class PasswordRecoveryService {
  /**
   * Конструктор сервісу відновлення паролю.
   * @param prismaService - Сервіс для роботи з базою даних Prisma.
   * @param userService - Сервіс для роботи з користувачами.
   * @param mailService - Сервіс для відправки email-повідомлень.
   */
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly mailService: MailService
  ) {}

  /**
   * Запрошує скидання пароля та відправляє токен на вказаний Email.
   * @param dto - DTO з адресом електронної пошти користувача.
   * @returns true, якщо токен успішно відправлено.
   * @throws NotFoundException - Якщо користувач не знайдений.
   */
  public async reset(dto: ResetPasswordDto) {
    const user = await this.userService.findByEmail(dto.email!)

    if (!user) {
      throw new NotFoundException(
        'Користувач не знайдений. Будь ласка, перевірте введений адрес електронної пошти та спробуйте знову.'
      )
    }

    const passwordResetToken = await this.generatePasswordResetToken(user.id)

    await this.mailService.sendPasswordResetEmail(
      user.email,
      passwordResetToken.token
    )

    return true
  }

  /**
   * Встановлює новий пароль для користувача.
   * @param dto - DTO з новим паролем.
   * @param token - Токен для скидання паролю.
   * @returns true, якщо пароль успішно змінено.
   * @throws NotFoundException - Якщо токен або користувач не знайдений.
   * @throws BadRequestException - Якщо токен застарів.
   */
  public async new(dto: NewPasswordDto, token: string) {
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        token,
        type: TokenType.PASSWORD_RESET
      }
    })

    if (!existingToken) {
      throw new NotFoundException(
        'Токен не знайдений. Будь ласка, перевірте правильність введеного токену або запитайте новий.'
      )
    }

    if (new Date(existingToken.expiresIn) < new Date()) {
      throw new BadRequestException(
        'Токен застарів. Будь ласка, запитайте новий токен для підтвердження скидання паролю.'
      )
    }

    await this.prismaService.user.update({
      where: { id: existingToken.userId },
      data: { password: await hash(dto.password!) }
    })

    await this.prismaService.token.delete({
      where: { id: existingToken.id }
    })

    return true
  }

  /**
   * Генерує токен для скидання паролю.
   * @param userId - ID користувача.
   * @returns Об'єкт токена скидання паролю.
   */
  private async generatePasswordResetToken(userId: string) {
    const token = uuidv4()
    const expiresIn = new Date(Date.now() + 3600 * 1000) // 1 година

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        userId,
        type: TokenType.PASSWORD_RESET
      }
    })

    if (existingToken) {
      await this.prismaService.token.delete({
        where: { id: existingToken.id }
      })
    }

    return this.prismaService.token.create({
      data: {
        userId,
        token,
        expiresIn,
        type: TokenType.PASSWORD_RESET
      }
    })
  }
}