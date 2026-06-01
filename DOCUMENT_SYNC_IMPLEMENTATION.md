# Синхронізація документів студентів - Реалізація

## Огляд

Реалізована автоматична синхронізація документів студентів через ЄДЕБО API під час планового cron завдання на 2:00 ночі. Система автоматично отримує документи студентів, которі не мають їх в базі даних.

## Архітектура

```
┌─────────────────────────────────────────────────────────────┐
│  EdboSyncService.scheduledSync() - Cron @2AM                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. syncStudents(fromDate)          ← Синхронізує студентів │
│     ├─ Отримує студентів з ЄДЕБО                           │
│     ├─ getPersonDocumentsSync()  ← Отримує документи       │
│     └─ Зберігає в БД                                       │
│                                                             │
│  2. syncStaff(fromDate)             ← Синхронізує персонал  │
│                                                             │
│  3. syncStudentDocuments()          ← Синхронізує документи │
│     ├─ Знаходить студентів без документів                  │
│     ├─ getPersonDocumentsSync()  ← Отримує документи       │
│     └─ Оновлює БД                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Компоненти

### 1. EdboService - метод отримання документів

**Файл**: `src/edbo/core/edbo.service.ts`

```typescript
/**
 * Отримує документи фізичної особи за UUID кодом (personCodeU).
 * Використовується для синхронізації документів студента.
 *
 * @param personCodeU - UUID код особи
 * @returns Масив документів особи
 */
async getPersonDocumentsSync(personCodeU: string): Promise<EdboPersonDocument[]>
```

**Особливості**:
- Викликає ЄДЕБО API endpoint: `POST /api/physPersons/documents`
- Параметр запиту: `{ personCode: personCodeU }`
- Обробляє помилки з логуванням (не кидає виключення)
- Повертає порожній масив у разі помилки

**Документи включають**:
- `idPersonDocumentType`: 5 (РНОКПП), 16 (Студентський квиток), 36 (Паспорт)
- `documentSeries`: Серія документа
- `documentNumbers`: Номер документа
- `rnokppUnzrValidity`: Валідність РНОКПП
- Інші 70+ полів від ЄДЕБО

### 2. EdboSyncService - основний сервіс синхронізації

**Файл**: `src/edbo/sync/edbo-sync.service.ts`

#### Метод A: `syncStudents(fromDate?: string)`

Розширений існуючий метод для включення синхронізації документів:

```typescript
for (const record of records) {
  // 1. Отримуємо документи студента
  const documents = await this.edboService.getPersonDocumentsSync(record.personCodeU)
  
  // 2. Добавляємо документи до даних
  const dataWithDocuments = {
    ...studentData,
    documents: documents as any, // Prisma конвертує в JSON
  }
  
  // 3. Зберігаємо в БД
  if (existing) {
    await this.prisma.student.update({...})
  } else {
    await this.prisma.student.create({...})
  }
}
```

#### Метод B: `syncStudentDocuments()`

Новий метод для синхронізації документів студентів без них:

```typescript
public async syncStudentDocuments(): Promise<number> {
  // 1. Знаходимо студентів без документів
  const studentsWithoutDocs = await this.prisma.student.findMany({
    where: {
      OR: [
        { documents: null },
        { documents: { equals: '[]' as any } },
      ],
    },
    take: 100, // Обмежуємо до 100 за раз
  })
  
  // 2. Для кожного студента отримуємо документи
  for (const student of studentsWithoutDocs) {
    const documents = await this.edboService.getPersonDocumentsSync(
      student.personCodeU
    )
    
    // 3. Оновлюємо запис студента
    await this.prisma.student.update({
      where: { id: student.id },
      data: { documents: documents as any },
    })
  }
}
```

#### Метод C: `scheduledSync()` - Cron завдання

```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
public async scheduledSync(): Promise<void> {
  const fromDate = this.getYesterdayIso()
  
  // Запускаємо три синхронізації паралельно
  const [students, staff, docs] = await Promise.allSettled([
    this.syncStudents(fromDate),
    this.syncStaff(fromDate),
    this.syncStudentDocuments(),
  ])
  
  // Логуємо результати
  this.logger.log(`Students: +${students.value.created} / ~${students.value.updated}`)
  this.logger.log(`Staff: +${staff.value.created} / ~${staff.value.updated}`)
  this.logger.log(`Documents: ${docs.value} synced`)
}
```

### 3. Prisma Schema - модель Student

**Файл**: `prisma/schema.prisma`

Додано нове поле:

```prisma
model Student {
  // ... інші поля ...
  
  // Документи від ЄДЕБО
  documents Json? @default("[]") @map("documents")
  
  @@map("students")
}
```

**Тип**: `Json` (PostgreSQL JSON array)
**Значення за замовчуванням**: `[]` (пустий масив)

Структура масиву `documents`:

```json
[
  {
    "idPersonDocumentType": 5,
    "documentNumbers": "1234567890",
    "documentSeries": null,
    "rnokppUnzrValidity": true,
    "rnokppUnzrCode": "1234567890",
    "unzr": "1234567890",
    "isRnokppUnzrValid": true
  },
  {
    "idPersonDocumentType": 16,
    "documentNumbers": "123456",
    "documentSeries": "СТ"
  },
  {
    "idPersonDocumentType": 36,
    "documentNumbers": "123456",
    "documentSeries": "МС"
  }
]
```

## Послідовність виконання

### Запуск автоматичної синхронізації (щодня о 2:00)

```
1. Cron вмикає scheduledSync() → 2:00 AM України (UTC+2)

2. Паралельно запускаються:
   ├─ syncStudents(yesterday_date)
   │  ├─ Отримує студентів з ЄДЕБО за останній день
   │  ├─ Для кожного студента отримує документи
   │  ├─ Оновлює/створює Student записи з документами
   │  └─ Логує: +X created / ~Y updated
   │
   ├─ syncStaff(yesterday_date)
   │  └─ Синхронізує персонал (як раніше)
   │
   └─ syncStudentDocuments()
      ├─ Знаходить до 100 студентів без документів
      ├─ Для кожного отримує документи з ЄДЕБО
      ├─ Оновлює Student записи
      └─ Логує: X/100 synced

3. Логуються результати всіх трьох операцій
```

### Обробка помилок

- **API помилка при отримані студентів**: логується, синхронізація пропускає студента
- **API помилка при отримані документів**: повертає порожній масив, студент зберігається без документів
- **DB помилка**: логується через Promise.allSettled(), процес продовжується

## Міграція БД

**Файл**: `prisma/migrations/20260601143021_add_documents_field_to_student/`

```sql
ALTER TABLE "students" ADD COLUMN "documents" JSONB NOT NULL DEFAULT '[]';
```

## Тестування

### Перевірити, що синхронізація працює:

```bash
# 1. Виконати Prisma Studio для перегляду студентів
npx prisma studio

# 2. Знайти студента з documents = []
# 3. Вручну запустити syncStudentDocuments():
#    - В контролері додати endpoint для тесту
#    - Або запустити через Nest CLI REPL

# 4. Перевірити, що documents заповнилися JSON масивом
```

### Log output приклад:

```
[Nest] 02:00:00 [EdboSyncService] Scheduled ЄДЕБО sync started (fromDate: 2026-05-31)
[Nest] 02:00:05 [EdboSyncService] Syncing students from ЄДЕБО...
[Nest] 02:00:15 [EdboSyncService] Syncing student documents from ЄДЕБО...
[Nest] 02:00:35 [EdboSyncService] Students sync: +15 / ~42
[Nest] 02:00:36 [EdboSyncService] Staff sync: +2 / ~5
[Nest] 02:00:45 [EdboSyncService] Student documents sync done: 43/45
```

## Типи ЄДЕБО API

### EdboPersonDocument (70+ полів)

```typescript
interface EdboPersonDocument {
  // Основні поля
  idPersonDocument: number
  idPersonDocumentType: number // 5=РНОКПП, 16=Квиток, 36=Паспорт
  documentSeries: string | null
  documentNumbers: string
  
  // РНОКПП специфічні
  rnokppUnzrValidity: boolean
  rnokppUnzrCode: string
  rnokppUnzrValidity: boolean
  unzr: string
  isRnokppUnzrValid: boolean
  
  // Дати
  dateIssue: string | null
  dateExpiration: string | null
  
  // Локалізація
  documentIssuePlaceName: string | null
  
  // Статус
  isAnnulled: boolean
  
  // ... інші 40+ полів
}
```

## Сумісність з реєстрацією

Документи від синхронізації зберігаються як JSON масив. При реєстрації студента:

1. Документи отримуються від ЄДЕБО API (як раніше)
2. Витягуються конкретні типи:
   - РНОКПП (type 5) → `rnokpp`
   - Студентський квиток (type 16) → `studentTicketSeries`, `studentTicketNumbers`
   - Паспорт (type 36) → `passportSeries`, `passportNumbers`
3. Окремі поля записуються в `student.rnokpp`, `student.studentTicketSeries` тощо
4. JSON масив зберігається в `student.documents` для подальшої верифікації

## Покращення та розширення

### Можливі удосконалення:

1. **Витяг окремих типів**: Розбити `documents` JSON на окремі поля з нормалізацією
   ```typescript
   // В методі mapStudentData():
   const rnokppDoc = docs.find(d => d.idPersonDocumentType === 5)
   studentData.rnokpp = rnokppDoc?.documentNumbers
   ```

2. **Фільтрація по типам документів**: Отримати лише конкретні типи
   ```typescript
   const docs = await this.edboService.getPersonDocumentsSync(
     personCodeU,
     { documentTypes: [5, 16, 36] } // фільтр
   )
   ```

3. **Оптимізація**: Батчеві запити для отримання документів багатьох студентів одночасно

4. **Аудит**: Логування всіх змін документів для отстежування

5. **Валідація**: Перевірка válidas документів перед зберіганням

## Проблеми та рішення

### Проблема 1: Документи не оновлюються
**Рішення**: Перевірити, чи `personCodeU` присутній для студента. Якщо null, отримати його з попередньої синхронізації.

### Проблема 2: API повертає помилку 401 (Unauthorized)
**Рішення**: Перевірити OAuth токен в EdboService, переоснови-тися на getToken()

### Проблема 3: Синхронізація займає занадто довго
**Рішення**: Зменшити `take: 100` в syncStudentDocuments(), або запустити `syncStudentDocuments` на окремому cron

## Посилання

- ЄДЕБО API: `/api/physPersons/documents`
- Prisma JSON: https://www.prisma.io/docs/concepts/components/prisma-schema/data-types#json
- Cron expressions: https://docs.nestjs.com/techniques/task-scheduling
