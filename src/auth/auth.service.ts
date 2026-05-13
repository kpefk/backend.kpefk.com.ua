import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { User } from '@prisma/client'
import { verify } from 'argon2'
import { Request, Response } from 'express'

import { UserService } from '@/user/user.service'

import { LoginDto } from './dto/login.dto'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'

@Injectable()
export class AuthService {
  public constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly twoFactorAuthService: TwoFactorAuthService
  ) {}

  /**
   * Виконує вход користувача в систему.
   * @param req - Об'єкт запиту Express.
   * @param dto - Об'єкт з даними для входу користувача.
   * @returns Об'єкт з користувачем після успішного входу.
   * @throws NotFoundException - Якщо користувач не знайдений.
   * @throws UnauthorizedException - Якщо пароль невірний або Email не підтверджений.
   */
  public async login(req: Request, dto: LoginDto): Promise<{ message: string } | { user: User }> {
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
          message: 'Перевірте вашу поштову адресу. Потрібен код двофакторної аутентифікації.'
        }
      }

      await this.twoFactorAuthService.validateTwoFactorToken(user.email, dto.code)
    }

    return this.saveSession(req, user)
  }

  /**
   * Завершує сесію користувача.
   * @param req - Об'єкт запиту Express.
   * @param res - Об'єкт відповіді Express.
   * @returns Проміс, який вирішується після завершення сесії.
   * @throws InternalServerErrorException - Якщо виникла проблема при завершенні сесії.
   */
  public async logout(req: Request, res: Response): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              'Не вдалося завершити сесію. Спробуйте ще раз.'
            )
          )
        }
        res.clearCookie(this.configService.getOrThrow<string>('SESSION_NAME'))
        resolve()
      })
    })
  }

  /**
   * Зберігає сесію користувача.
   * @param req - Об'єкт запиту Express.
   * @param user - Об'єкт користувача.
   * @returns Проміс, який вирішується після збереження сесії.
   * @throws InternalServerErrorException - Якщо виникла проблема при збереженні сесії.
   */
  public async saveSession(req: Request, user: User): Promise<{ user: User }> {
    return new Promise<{ user: User }>((resolve, reject) => {
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
        resolve({ user })
      })
    })
  }
}