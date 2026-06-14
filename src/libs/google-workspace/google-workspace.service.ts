import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, admin_directory_v1 } from 'googleapis'

// ── Вхідні дані для побудови адреси ──────────────────────────────────────────

export interface StudentEmailInput {
  /** ПІБ транслітерацією з ЄДЕБО, напр. "Kovalenko Ivan Petrovych" */
  personNameEn: string | null
  /** ПІБ українською — резервний варіант якщо personNameEn відсутній */
  personFIO: string
  /** Дата народження */
  birthday: Date | null
  /** Спеціальність, напр. "D1 Менеджмент" або "122 Комп'ютерні науки" */
  fullSpecialityName: string | null
  /** Рік вступу (ліцензійний рік), напр. 2025 */
  licenseYear: number | null
}

// ── Результат ─────────────────────────────────────────────────────────────────

export interface ProvisionResult {
  email: string
  /** true = створено зараз, false = вже існував */
  created: boolean
}

// ── KMU-2010 таблиця транслітерації ──────────────────────────────────────────

// ── Транслітерація ДМСУ (dmsu.gov.ua) ───────────────────────────────────────
// Правила застосовуються посимвольно всередині кожного слова;
// правила з '^' спрацьовують лише на початку слова.

const DMSU_RULES: Array<{ pattern: string; replace: string }> = [
  { pattern: 'а',   replace: 'a'    },
  { pattern: 'б',   replace: 'b'    },
  { pattern: 'в',   replace: 'v'    },
  { pattern: 'зг',  replace: 'zgh'  },
  { pattern: 'Зг',  replace: 'Zgh'  },
  { pattern: 'г',   replace: 'h'    },
  { pattern: 'ґ',   replace: 'g'    },
  { pattern: 'д',   replace: 'd'    },
  { pattern: 'е',   replace: 'e'    },
  { pattern: '^є',  replace: 'ye'   },
  { pattern: 'є',   replace: 'ie'   },
  { pattern: 'ж',   replace: 'zh'   },
  { pattern: 'з',   replace: 'z'    },
  { pattern: 'и',   replace: 'y'    },
  { pattern: 'і',   replace: 'i'    },
  { pattern: '^ї',  replace: 'yi'   },
  { pattern: 'ї',   replace: 'i'    },
  { pattern: '^й',  replace: 'y'    },
  { pattern: 'й',   replace: 'i'    },
  { pattern: 'к',   replace: 'k'    },
  { pattern: 'л',   replace: 'l'    },
  { pattern: 'м',   replace: 'm'    },
  { pattern: 'н',   replace: 'n'    },
  { pattern: 'о',   replace: 'o'    },
  { pattern: 'п',   replace: 'p'    },
  { pattern: 'р',   replace: 'r'    },
  { pattern: 'с',   replace: 's'    },
  { pattern: 'т',   replace: 't'    },
  { pattern: 'у',   replace: 'u'    },
  { pattern: 'ф',   replace: 'f'    },
  { pattern: 'х',   replace: 'kh'   },
  { pattern: 'ц',   replace: 'ts'   },
  { pattern: 'ч',   replace: 'ch'   },
  { pattern: 'ш',   replace: 'sh'   },
  { pattern: 'щ',   replace: 'shch' },
  { pattern: 'ьо',  replace: 'io'   },
  { pattern: 'ьї',  replace: 'ii'   },
  { pattern: 'ь',   replace: ''     },
  { pattern: '^ю',  replace: 'yu'   },
  { pattern: 'ю',   replace: 'iu'   },
  { pattern: '^я',  replace: 'ya'   },
  { pattern: 'я',   replace: 'ia'   },
  { pattern: 'А',   replace: 'A'    },
  { pattern: 'Б',   replace: 'B'    },
  { pattern: 'В',   replace: 'V'    },
  { pattern: 'Г',   replace: 'H'    },
  { pattern: 'Ґ',   replace: 'G'    },
  { pattern: 'Д',   replace: 'D'    },
  { pattern: 'Е',   replace: 'E'    },
  { pattern: '^Є',  replace: 'Ye'   },
  { pattern: 'Є',   replace: 'Ie'   },
  { pattern: 'Ж',   replace: 'Zh'   },
  { pattern: 'З',   replace: 'Z'    },
  { pattern: 'И',   replace: 'Y'    },
  { pattern: 'І',   replace: 'I'    },
  { pattern: '^Ї',  replace: 'Yi'   },
  { pattern: 'Ї',   replace: 'I'    },
  { pattern: '^Й',  replace: 'Y'    },
  { pattern: 'Й',   replace: 'I'    },
  { pattern: 'К',   replace: 'K'    },
  { pattern: 'Л',   replace: 'L'    },
  { pattern: 'М',   replace: 'M'    },
  { pattern: 'Н',   replace: 'N'    },
  { pattern: 'О',   replace: 'O'    },
  { pattern: 'П',   replace: 'P'    },
  { pattern: 'Р',   replace: 'R'    },
  { pattern: 'С',   replace: 'S'    },
  { pattern: 'Т',   replace: 'T'    },
  { pattern: 'У',   replace: 'U'    },
  { pattern: 'Ф',   replace: 'F'    },
  { pattern: 'Х',   replace: 'Kh'   },
  { pattern: 'Ц',   replace: 'Ts'   },
  { pattern: 'Ч',   replace: 'Ch'   },
  { pattern: 'Ш',   replace: 'Sh'   },
  { pattern: 'Щ',   replace: 'Shch' },
  { pattern: 'Ь',   replace: ''     },
  { pattern: '^Ю',  replace: 'Yu'   },
  { pattern: 'Ю',   replace: 'Iu'   },
  { pattern: '^Я',  replace: 'Ya'   },
  { pattern: 'Я',   replace: 'Ia'   },
  { pattern: '’', replace: ''  }, // '
  { pattern: '\'',  replace: ''     },
  { pattern: '`',   replace: ''     },
]

/**
 * Транслітерує слово за правилами ДМСУ.
 * Вхідний рядок розбивається на слова по [-_ \n], кожне слово обробляється окремо
 * (щоб правила з ^ коректно спрацьовували на початку кожного слова).
 */
function transliterate(text: string): string {
  const words = text.split(/[-_ \n]/)
  const translitWords = words.map(word => {
    for (const rule of DMSU_RULES) {
      word = word.replace(new RegExp(rule.pattern, 'gm'), rule.replace)
    }
    return word
  })
  return translitWords.join(' ')
}

// ── Сервіс ────────────────────────────────────────────────────────────────────

@Injectable()
export class GoogleWorkspaceService {
  private readonly logger = new Logger(GoogleWorkspaceService.name)
  private readonly directory: admin_directory_v1.Admin
  private readonly domain = 'kpefk.com.ua'

  public constructor(private readonly configService: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.configService.getOrThrow<string>('GOOGLE_DRIVE_CLIENT_EMAIL'),
        private_key: this.configService
          .getOrThrow<string>('GOOGLE_DRIVE_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
      },
      clientOptions: {
        subject: this.configService.getOrThrow<string>('GOOGLE_WORKSPACE_ADMIN'),
      },
      scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
    })

    this.directory = google.admin({ version: 'directory_v1', auth })
  }

  // ── Публічні методи ───────────────────────────────────────────────────────

  /**
   * Генерує корпоративну адресу за шаблоном:
   * {Прізвище}.{ІніціалИмені}{ДД}{ММ}.{КодСпеціальності}.{РікВступу2ц}@kpefk.com.ua
   *
   * Приклад: kovalenko.i1503.d1.25@kpefk.com.ua
   */
  public buildStudentEmail(student: StudentEmailInput): string {
    const { lastName, firstInitial } = this.parseName(student)
    const { day, month } = this.parseBirthday(student.birthday)
    const specialtyCode = this.extractSpecialtyCode(student.fullSpecialityName)
    const enrollYear = this.formatEnrollYear(student.licenseYear)

    return `${lastName}.${firstInitial}${day}${month}.${specialtyCode}.${enrollYear}@${this.domain}`
  }

  /**
   * Створює акаунт у Google Workspace для студента.
   * Якщо акаунт вже існує — повертає `created: false` без помилки.
   *
   * @param email — вже згенерована адреса (зберігається в БД до виклику)
   * @param student — дані для заповнення профілю
   */
  public async provisionAccount(
    email: string,
    student: StudentEmailInput & { personFIO: string },
  ): Promise<ProvisionResult> {
    const { lastName, firstName } = this.parseFullName(student)

    try {
      await this.directory.users.insert({
        requestBody: {
          primaryEmail: email,
          name: { familyName: lastName, givenName: firstName },
          password: this.generateTemporaryPassword(),
          changePasswordAtNextLogin: true,
          orgUnitPath: '/Студенти',
        },
      })

      this.logger.log(`Provisioned workspace account: ${email}`)
      return { email, created: true }
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string }

      // 409 = Entity already exists
      if (err?.code === 409) {
        this.logger.warn(`Workspace account already exists: ${email}`)
        return { email, created: false }
      }

      this.logger.error(`Failed to provision ${email}: ${err?.message ?? String(error)}`)
      throw new InternalServerErrorException(
        `Не вдалося створити Google Workspace акаунт для ${email}`,
      )
    }
  }

  /**
   * Перевіряє чи акаунт з таким email вже існує в домені.
   */
  public async accountExists(email: string): Promise<boolean> {
    try {
      await this.directory.users.get({ userKey: email })
      return true
    } catch {
      return false
    }
  }

  // ── Приватні утиліти ──────────────────────────────────────────────────────

  private parseName(student: StudentEmailInput): { lastName: string; firstInitial: string } {
    const source = student.personNameEn?.trim() || this.fallbackTranslit(student.personFIO)
    const parts = source.trim().split(/\s+/)

    const lastName = (parts[0] ?? 'unknown')
      .toLowerCase()
      .replace(/[^a-z]/g, '')

    const firstInitial = parts[1]
      ? parts[1][0].toLowerCase().replace(/[^a-z]/, '')
      : 'x'

    return { lastName, firstInitial }
  }

  private parseFullName(student: StudentEmailInput): { lastName: string; firstName: string } {
    const source = student.personNameEn?.trim() || this.fallbackTranslit(student.personFIO)
    const parts = source.trim().split(/\s+/)
    return {
      lastName: parts[0] ?? 'Unknown',
      firstName: parts[1] ?? 'Unknown',
    }
  }

  /** Транслітерація українського ПІБ як резерв, якщо personNameEn не заповнений */
  private fallbackTranslit(fio: string): string {
    return transliterate(fio)
  }

  private parseBirthday(birthday: Date | null): { day: string; month: string } {
    if (!birthday) return { day: '00', month: '00' }
    const d = new Date(birthday)
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    return { day, month }
  }

  /**
   * Витягує код спеціальності з першого слова рядка.
   * "G3 Електрична інженерія" → "g3"
   * "122 Комп'ютерні науки" → "122"
   * null → "xx"
   */
  private extractSpecialtyCode(fullSpecialityName: string | null): string {
    if (!fullSpecialityName) return 'xx'
    const code = fullSpecialityName.trim().split(/\s+/)[0]
    return code ? code.toLowerCase().replace(/[^a-z0-9]/g, '') : 'xx'
  }

  private formatEnrollYear(licenseYear: number | null): string {
    if (!licenseYear) return 'xx'
    return String(licenseYear).slice(-2)
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }
}
