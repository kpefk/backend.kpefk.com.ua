# Реалізація реєстрації студентів

## Огляд

Реалізована повна система реєстрації студентів з верифікацією через ЄДЕБО API. Система підтримує пошук студентів за трьома типами документів:

1. **РНОКПП/ІПН** (найбільш надійний)
2. **Студентський квиток**
3. **Паспорт** (fallback)

## Архітектура

### 1. Prisma Schema (`prisma/schema.prisma`)

Додані нові поля до моделі `Student`:
- `rnokpp` - Реєстраційний номер облікової картки
- `studentTicketSeries` - Серія студентського квитка
- `studentTicketNumbers` - Номер студентського квитка
- `passportSeries` - Серія паспорта
- `passportNumbers` - Номер паспорта
- `passportDocumentSeries` - Для сумісності (серія документа)
- `passportDocumentNumbers` - Для сумісності (номер документа)

### 2. EdboService (`src/edbo/core/edbo.service.ts`)

Додані методи для пошуку студентів:

```typescript
// Пошук по РНОКПП
async findStudentByRnokpp(rnokpp: string, universityId: number)

// Пошук по студентському квитку
async findStudentByTicket(series: string, number: string, universityId: number)

// Пошук по паспорту
async findStudentByPassport(series: string, number: string, universityId: number)

// Отримання документів фізичної особи
async getPersonDocumentsByUnzr(unzr: string): Promise<EdboPersonDocument[]>

// Пошук студентів у списку
async searchStudents(params: EdboStudentSearchParams): Promise<any[]>
```

**Логіка пошуку:**
1. Отримує список студентів з ЄДЕБО за `universityId`
2. Для кожного студента витягує документи через УНЗР
3. Перевіряє, чи документи відповідають критеріям пошуку
4. Повертає студента з документами

### 3. AuthService (`src/auth/auth.service.ts`)

Оновлена система реєстрації:

```typescript
public async register_student(req: Request, dto: RegisterStudentDto)
```

**Процес реєстрації:**

1. **Перевірка згоди** - користувач повинен дати згоду на обробку даних
2. **Перевірка email** - email повинен бути унікальним
3. **Пошук студента** - спочатку локально, потім в ЄДЕБО API
   - Пошук по РНОКПП (якщо не потрібно у відмові `no_rnokpp: false`)
   - Пошук по студентському квитку (якщо не потрібно у відмові)
   - Пошук по паспорту (fallback)
4. **Перевірка зв'язку** - студент не повинен бути уже прив'язаний до акаунту
5. **Хешування пароля** - за допомогою `argon2`
6. **Створення User + Student** - в одній транзакції
   - Створюємо User запис
   - Оновлюємо або створюємо Student запис з даними з ЄДЕБО
   - Синхронізуємо документи
7. **Збереження сесії** - користувач автоматично входить

**Приватні методи:**

```typescript
private async findStudentInEdebo(dto: RegisterStudentDto)
  // Шукає студента спочатку локально, потім в ЄДЕБО API

private mapEdboStudentData(edeboStudent: any, dto: RegisterStudentDto, edeboDocuments: any[])
  // Маппує дані з ЄДЕБО на Student модель Prisma
```

## DTO - `RegisterStudentDto`

```typescript
{
  email: string              // Email студента (обов'язковий)
  password: string           // Пароль (мін. 8 символів, має містити великі, малі літери та цифри)
  consent: boolean           // Згода на обробку даних (обов'язкова)
  
  // Варіант 1: РНОКПП
  rnokpp?: string           // 10 цифр
  no_rnokpp?: boolean       // Якщо не має РНОКПП

  // Варіант 2: Студентський квиток
  serial_ticket?: string
  number_ticket?: string
  no_student_ticket?: boolean

  // Варіант 3: Паспорт (fallback)
  serial_passport?: string
  number_passport?: string
}
```

## Приклад запиту

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "student@kpefk.edu.ua",
  "password": "P@ssw0rd123",
  "consent": true,
  "rnokpp": "1234567890"
}
```

## Приклад відповіді (успіх)

```json
{
  "user": {
    "id": "uuid-здесь",
    "email": "student@kpefk.edu.ua",
    "role": "STUDENT",
    "isTwoFactorEnabled": false,
    "isFirstLogin": true,
    "isActive": true,
    "createdAt": "2026-06-01T...",
    "updatedAt": "2026-06-01T..."
  }
}
```

## Обробка помилок

| Помилка | HTTP Status | Опис |
|---------|-----------|------|
| Немає згоди | 400 | `no_rnokpp` і `no_student_ticket` не можуть обидва бути `true` |
| Email занятий | 409 | Користувач з такою email-адресою вже зареєстрований |
| Студент не знайдений | 404 | Студент не знайдений в ЄДЕБО за наданими документами |
| Студент уже прив'язаний | 409 | Цей студент вже має зареєстрований акаунт |
| Невалідна капча | 400 | reCAPTCHA не пройдена |

## Пріоритет документів

1. **РНОКПП** - найбільш надійна ідентифікація (документ типу 5)
2. **Студентський квиток** - перевіряється серія та номер (документ типу 16)
3. **Паспорт** - fallback варіант (документ типу 36)

## Типи документів ЄДЕБО API

| ID | Назва | Використання |
|----|-------|--------------|
| 5 | РНОКПП | Основна верифікація |
| 16 | Студентський квиток | Альтернативна верифікація |
| 36 | Паспорт громадянина України | Fallback верифікація |

## Синхронізація даних

При реєстрації система:
1. Витягує всі дані про студента з ЄДЕБО
2. Зберігає документи в нові поля Student
3. Синхронізує освітню програму, факультет, групу та інші дані

## Відмова від документів

Користувач може вказати, що не має певного документа:

```json
{
  "email": "student@kpefk.edu.ua",
  "password": "P@ssw0rd123",
  "consent": true,
  "no_rnokpp": true,
  "serial_ticket": "BC",
  "number_ticket": "123456"
}
```

Система перейде до наступного варіанту пошуку.

## Процес налагодження

1. Запустіть migration: `npm run prisma:migrate:dev`
2. Переконайтесь, що EDEBO_CODE встановлено в `.env`
3. Тестуйте через Swagger UI або Postman
4. Перевіряйте логи в консолі для діагностики

## Важливі примітки

- **Капча**: Метод `register` захищений reCAPTCHA v3
- **Аутентифікація**: Після реєстрації користувач автоматично входить
- **Сесія**: Сесія зберігається в Redis/БД
- **Безпека**: Пароль хешується з argon2

## Можливі розширення

1. Email верифікація перед фіналізацією реєстрації
2. SMS верифікація через РНОКПП
3. Двофакторна аутентифікація при реєстрації
4. Синхронізація фото студента з ЄДЕБО
5. Сповіщення адміністратора про нову реєстрацію
