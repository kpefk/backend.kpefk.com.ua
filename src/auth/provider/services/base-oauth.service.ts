import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'

import { TypeBaseProviderOptions } from './types/base-provider-options.types'
import { TokenResponse } from './types/token-response.types'
import { TypeUserInfo } from './types/user-info.types'

/**
 * Базовий сервіс для роботи з OAuth-провайдерами.
 *
 * Цей сервіс надає загальні методи для аутентифікації через OAuth, такі як
 * отримання URL для авторизації, витягування інформації про користувача та обробка токенів.
 */
@Injectable()
export class BaseOAuthService {
  private BASE_URL!: string

  /**
   * Конструктор базового сервісу OAuth.
   *
   * @param options - Опції провайдера, що містять необхідні параметри для аутентифікації.
   */
  public constructor(private readonly options: TypeBaseProviderOptions) {}

  /**
   * Витягує інформацію про користувача з даних, отриманих від провайдера.
   *
   * @param data - Дані, отримані від провайдера.
   * @returns Об'єкт з інформацією про користувача, включаючи назву провайдера.
   */
  protected async extractUserInfo(data: Partial<TypeUserInfo>): Promise<TypeUserInfo> {
    return {
      ...data,
      provider: this.options.name
    } as TypeUserInfo
  }

  /**
   * Формує URL для авторизації.
   *
   * @returns URL для авторизації користувача через OAuth.
   */
  public getAuthUrl(): string {
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: this.options.client_id,
      redirect_uri: this.getRedirectUrl(),
      scope: this.options.scopes.join(' '),
      access_type: 'offline',
      prompt: 'select_account'
    })

    return `${this.options.authorize_url}?${query}`
  }

  /**
   * Знаходить користувача по коду авторизації та повертає інформацію про користувача.
   *
   * @param code - Код авторизації, отриманий від провайдера.
   * @returns Об'єкт з інформацією про користувача.
   * @throws BadRequestException - Якщо не вдалося отримати токени або користувача.
   * @throws UnauthorizedException - Якщо токен доступу недійсний.
   */
  public async findUserByCode(code: string): Promise<TypeUserInfo> {
    const tokenQuery = new URLSearchParams({
      client_id: this.options.client_id,
      client_secret: this.options.client_secret,
      code,
      redirect_uri: this.getRedirectUrl(),
      grant_type: 'authorization_code'
    })

    const tokensRequest = await fetch(this.options.access_url, {
      method: 'POST',
      body: tokenQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      }
    })

    if (!tokensRequest.ok) {
      throw new BadRequestException(
        `Не вдалося отримати токени з ${this.options.access_url}. Перевірте правильність коду авторизації.`
      )
    }

    const tokens = await tokensRequest.json() as TokenResponse

    if (!tokens.access_token) {
      throw new BadRequestException(
        `Немає токена доступу з ${this.options.access_url}. Перевірте, що код авторизації дійсний.`
      )
    }

    const userRequest = await fetch(this.options.profile_url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })

    if (!userRequest.ok) {
      throw new UnauthorizedException(
        `Не вдалося отримати профіль користувача з ${this.options.profile_url}. Перевірте правильність токена доступу.`
      )
    }

    const user = await userRequest.json()
    const userData = await this.extractUserInfo(user)

    return {
      ...userData,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at ?? (
        tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined
      ),
      provider: this.options.name
    }
  }

  /**
   * Повертає URL для перенаправлення після успішної аутентифікації.
   *
   * @returns URL для перенаправлення.
   */
  private getRedirectUrl(): string {
    return `${this.BASE_URL}/auth/oauth/callback/${this.options.name}`
  }

  /**
   * Встановлює базовий URL для сервісу.
   *
   * @param value - Новий базовий URL.
   */
  public set baseUrl(value: string) {
    this.BASE_URL = value
  }

  /**
   * Повертає назву провайдера.
   *
   * @returns Назва провайдера.
   */
  public get name(): string {
    return this.options.name
  }

  /**
   * Повертає URL для отримання токенів.
   *
   * @returns URL для отримання токенів.
   */
  public get access_url(): string {
    return this.options.access_url
  }

  /**
   * Повертає URL для отримання профілю користувача.
   *
   * @returns URL профілю.
   */
  public get profile_url(): string {
    return this.options.profile_url
  }

  /**
   * Повертає масив областей доступу.
   *
   * @returns Масив областей доступу.
   */
  public get scopes(): ReadonlyArray<string> {
    return this.options.scopes
  }
}