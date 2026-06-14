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
 * Service for managing password recovery.
 */
@Injectable()
export class PasswordRecoveryService {
  /**
   * Constructor of the password recovery service.
   * @param prismaService - The Prisma service for database operations.
   * @param userService - The user service for user operations.
   * @param mailService - The mail service for sending email notifications.
   */
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly mailService: MailService
  ) {}

  /**
   * Requests password reset and sends a token to the specified email.
   * @param dto - DTO with the user's email address.
   * @returns true if the token was sent successfully.
   * @throws NotFoundException if the user is not found.
   */
  public async reset(dto: ResetPasswordDto) {
    const user = await this.userService.findByEmail(dto.email!)

    // Завжди повертаємо однакову відповідь, незалежно від існування акаунта,
    // щоб не дозволяти перебір (enumeration) зареєстрованих email-адрес.
    if (user) {
      const passwordResetToken = await this.generatePasswordResetToken(user.id)

      await this.mailService.sendPasswordResetEmail(
        user.email,
        passwordResetToken.token
      )
    }

    return true
  }

  /**
   * Sets a new password for the user.
   * @param dto - DTO with the new password.
   * @param token - The password reset token.
   * @returns true if the password was changed successfully.
   * @throws NotFoundException if the token or user is not found.
   * @throws BadRequestException if the token has expired.
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
   * Generates a password reset token.
   * @param userId - The user ID.
   * @returns The password reset token object.
   */
  private async generatePasswordResetToken(userId: string) {
    const token = uuidv4()
    const expiresIn = new Date(Date.now() + 3600 * 1000) // 1 hour

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