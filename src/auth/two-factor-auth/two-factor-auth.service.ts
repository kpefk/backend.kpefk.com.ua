import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { TokenType } from '@prisma/client'
import { randomInt } from 'crypto'

import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'

@Injectable()
export class TwoFactorAuthService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly userService: UserService
  ) {}

  public async validateTwoFactorToken(email: string, code: string): Promise<boolean> {
    const user = await this.userService.findByEmail(email)

    if (!user) {
      throw new NotFoundException('Користувача не знайдено.')
    }

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        userId: user.id,
        type: TokenType.TWO_FACTOR
      }
    })

    if (!existingToken) {
      throw new NotFoundException(
        'Токен двофакторної аутентифікації не знайдено.'
      )
    }

    if (existingToken.token !== code) {
      throw new BadRequestException(
        'Невірний код двофакторної аутентифікації. Будь ласка, перевірте введений код та спробуйте знову.'
      )
    }

    if (new Date(existingToken.expiresIn) < new Date()) {
      throw new BadRequestException(
        'Термін дії токена минув. Будь ласка, запитайте новий токен.'
      )
    }

    await this.prismaService.token.delete({
      where: { id: existingToken.id }
    })

    return true
  }

  public async sendTwoFactorToken(email: string): Promise<boolean> {
    const token = await this.generateTwoFactorToken(email)

    await this.mailService.sendTwoFactorTokenEmail(email, token.token)

    return true
  }

  private async generateTwoFactorToken(email: string) {
    const user = await this.userService.findByEmail(email)

    if (!user) {
      throw new NotFoundException('Користувача не знайдено.')
    }

    const token = randomInt(100000, 1000000).toString()
    const expiresIn = new Date(Date.now() + 300000) // 5 хвилин

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        userId: user.id,
        type: TokenType.TWO_FACTOR
      }
    })

    if (existingToken) {
      await this.prismaService.token.delete({
        where: { id: existingToken.id }
      })
    }

    return this.prismaService.token.create({
      data: {
        userId: user.id,
        token,
        expiresIn,
        type: TokenType.TWO_FACTOR
      }
    })
  }
}