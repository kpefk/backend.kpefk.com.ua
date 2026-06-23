# CLAUDE.md — backend.kpefk.com.ua

> Інструкція для Claude Code як AI pair programmer / maintainer.

---

## Project overview
**MyKPEFK Backend** — серверна частина інформаційної системи КПЕФК (коледж).
**Стек:** NestJS · Prisma · PostgreSQL · Redis (сесії через `connect-redis`) · `@nestjs/schedule` (cron) · ЄДЕБО HTTP API
**Доменні сутності та їх джерела:**

| Сутність | Джерело | Примітка |
|----------|---------|----------|
| `Student` | ЄДЕБО sync | `/api/studentEducations/list`, поле `modifyDate` |
| `Teacher` | ЄДЕБО sync | `/api/university/staff/list`, поле `dateLastChange` |
| `Group` | Похідна від `Student.groupName` | Створюється при sync, не вручну |
| `User` | Локальна БД | Auth, роль, профіль |
| `Token` | Локальна БД | 2FA, password reset |
| `SyncState` | Локальна БД | Ключі: `students_last_sync_at`, `staff_last_sync_at` |
| `Classroom` | Локальна БД | Ручні записи, фото, Google Drive PDF |

Академічні сутності синхронізуються з ЄДЕБО. Локальна система зберігає власні ручні атрибути та зв'язки (куратор групи, User-профіль, аудиторії) — ці дані sync не перетирає.

---

## Current architecture

```
src/
├── auth/               # login, register, 2FA, OAuth (Google), guards, decorators
├── user/               # профіль, зміна паролю
├── admin/              # управління користувачами
├── student/            # student-specific endpoints
├── staff/              # teacher-specific endpoints
├── groups/             # групи, куратор, трансфери, history
│   ├── groups.service.ts           # findAll, findById, assignCurator, syncFromStudents
│   └── student-group-history.service.ts
├── classroom/          # аудиторії, фото, Google Drive passport PDF
├── edbo/
│   ├── core/           # EdboService: HTTP клієнт, OAuth token, кеш
│   ├── sync/           # EdboSyncService: cron, incremental sync, SyncStateService
│   ├── entrance/       # вступна кампанія (DTO-only, ~46 DTOs)
│   ├── students/       # документи та екзамени студента
│   └── listeners/      # зовнішній listeners API
├── libs/
│   ├── mail/           # @nestjs-modules/mailer
│   ├── google-drive/   # googleapis
│   └── common/         # utils, decorators
├── prisma/             # PrismaService (singleton)
└── config/             # mailer, providers, recaptcha config loaders
```

**Auth:** сесійна (express-session + RedisStore). Guards: `AuthGuard`, `RolesGuard`, `ProviderGuard`. Декоратори: `@Auth()`, `@Roles(...)`, `@Authorized()`.

---

## Production rules

- **Prisma — єдиний доступ до БД.** Без сирих SQL-запитів поза Prisma.
- **Модульна структура NestJS.** Логіка — тільки в сервісі, не в контролері.
- **Sync і UI — окремі bounded contexts.** Весь ЄДЕБО-sync живе в `edbo/sync/`. Групова UI-логіка — в `groups/`.
- **Ручні атрибути sync не перезаписує.** `Group.curatorId` — ручний. В `syncFromStudents` upsert групи робить `update: {}` — поле не торкається.
- **Куратор — 1:1.** `curatorId` є `@unique` у схемі. `assignCurator` перевіряє конфлікт перед записом.
- **Production-first.** Без тимчасових хаків і обходів.
- **use bun** - Використовуй bun а не npm
---

## Sync rules

> Файли: `src/edbo/sync/edbo-sync.service.ts`, `src/edbo/sync/sync-state.service.ts`

- **Sync incremental.** Студенти: порівнюється `modifyDate` із `students_last_sync_at`. Стаф: `dateLastChange` із `staff_last_sync_at`.
- **SYNC_OVERLAP_MS = 10 хв** — вікно для компенсації clock drift між сервером і ЄДЕБО. Якщо змінюється — пояснити в коміті навіщо.
- **`getPersonDocumentsSync()` — дорогий виклик** (1 HTTP-запит на студента). Поточна стратегія: тільки backfill для студентів без документів. Не розширювати без аналізу навантаження.
- **SyncState оновлюється тільки після успіху.** `students_last_sync_at` / `staff_last_sync_at` записуються тільки після повного успішного проходу — це захист від втрати записів.
- **Cron: щодня о 02:00** (`EVERY_DAY_AT_2AM`). Паралельний запуск `syncStudents` + `syncStaff` + `syncStudentDocuments`. Помилка одного не зупиняє інших.
- **Не мішати sync і UI.** `groupsService.syncFromStudents()` — єдина точка входу зі sync у групи.

---

## Prisma rules

- **Не видаляти поля** без явної причини — вони можуть бути в sync-mapping або у відповідях API.
- **Не змінювати `@map(...)`** без потреби — це змінює назви колонок і ламає міграції.
- **Усі зміни схеми — тільки через міграцію:**
  ```
  npx prisma migrate dev --name <назва>
  ```
- **Перевіряти `onDelete` при додаванні зв'язків.** Cascade може ненавмисно видалити пов'язані записи.
- **Upsert замість delete+insert** для sync-даних — безпечніше при паралельних запитах.
- **`SyncState` — проста key-value таблиця.** Не ускладнювати без реальної потреби.

---

## Change workflow

### Перед змінами
- [ ] Прочитати пов'язані файли: `schema.prisma`, сервіс, контролер, модуль
- [ ] Знайти всі місця де зачіпається зміна (grep по полю / методу)
- [ ] Перевірити, чи є модель або сервіс, що передбачається — не припускати їх існування

### Внесення змін
- [ ] Запропонувати план — узгодити з користувачем перед реалізацією
- [ ] Точкові зміни. Рефакторинг — тільки за окремим запитом
- [ ] Обирати найпростіше production-ready рішення

### Після змін
- [ ] Якщо `schema.prisma` змінено → `npx prisma migrate dev --name <назва>`
- [ ] Якщо sync змінено → оцінити вплив на кількість HTTP-запитів до ЄДЕБО
- [ ] Коротко: які файли змінено, які ризики

---

## Group rules

- **Group — похідна сутність.** Основний сценарій: групи створюються автоматично зі `Student.groupName` під час `syncFromStudents`. Якщо з'являється потреба в ручному створенні — це окреме рішення, яке треба узгодити.
- **`Group.curatorId` sync не перезаписує.** Це ручний атрибут: `upsert({ update: {} })` — явна гарантія в коді.
- **`detectChangeReason()` — евристика, не жорстке правило.** Поточна логіка: якщо ≥75% студентів старої групи перейшло в одну нову → `COURSE_PROMOTION`, інакше → `TRANSFER`. Перший sync або відсутність старої групи → `EDEBO_SYNC`. Поріг може змінюватись — документуй зміну в коміті.
- **`StudentGroupHistory` — журнал переміщень.** Існує в схемі та коді. Не видаляти без явної причини.
- **Не зав'язувати критичну логіку на текстовий `groupName`.** Для нових зв'язків з групою — FK на `Group.id`, не рядкове порівняння.

---

## Coding style

- **TypeScript** з явними типами. Уникати `any`. DTO з `class-validator`.
- **NestJS pattern:** `Module → Controller → Service`. Бізнес-логіка — тільки в сервісі.
- **Маленькі приватні helper-методи** замість великих монолітних функцій (приклад: `buildGroupMeta`, `detectChangeReason`).
- **Зрозумілі назви:** `syncFromStudents`, `assignCurator`, `detectChangeReason` — не `process`, `handle`, `do`.
- **Logger:** `new Logger(ClassName.name)` — не `console.log`.
- **JSDoc** для нетривіальних методів, особливо в sync і groups.
- **Коментар тільки на "чому"**, не на "що" — якщо є неочевидний constraint чи обхід.
- Увесь код має відповідати внутрішньому стандарту TypeScript 6.0 (strict-first, без `any`, з явною обробкою nullability).

---

## TypeScript 6.0 policy

- Увесь новий і змінений код має відповідати внутрішньому стандарту **TypeScript 6.0**.
- Це означає: **strict-first**, без неявних припущень, без розмитих типів, без погіршення наявної типобезпеки.
- `any` заборонений, окрім виняткових інтеграційних місць; у таких випадках використовувати `unknown` або локальне звуження типу, якщо це можливо.
- `null` і `undefined` мають оброблятись явно; не маскувати помилки через truthy/falsy логіку.
- Публічні методи сервісів, helper-функції з бізнес-логікою, DTO-mappers, config-builders і Prisma-related helpers мають мати явні типи.
- Заборонено додавати код, який вимагає послаблення `strict`-налаштувань TypeScript для компіляції.
- `as`, non-null assertion `!`, широкі касти та нестрогі `Record<string, any>` дозволені лише коли без них неможливо обійтись і це очевидно виправдано.
- У сумнівних випадках обирати рішення з кращою типізацією, навіть якщо воно трохи довше в реалізації.

--

## Anti-patterns

- Не додавати черги, кеші, event bus якщо задача вирішується простіше.
- Не робити breaking changes у sync без явного запиту — це зачіпає production дані.
- Не змінювати бізнес-сенс моделей "для краси" — `Student`, `Teacher`, `Group` відображають структуру ЄДЕБО.
- Не генерувати архітектуру (CQRS, Event Sourcing, Repository pattern) без конкретної потреби.
- Не створювати абстракції наперед. Три схожі рядки — ще не привід для helper-класу.
- Не видаляти `SyncState` записи вручну без розуміння наслідків для incremental sync.
- Не обходити `AuthGuard` / `RolesGuard` без явної причини в задачі.
- Не припускати існування моделей, сервісів або полів — перевіряти в коді перед використанням.
