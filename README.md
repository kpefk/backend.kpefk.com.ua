# MyKPEFK — Server

> Backend of the enterprise educational management system for **KPEFK LNTU**

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Project overview

**MyKPEFK** is the server-side of the information system for Kovel Industrial and Economic Vocational College of Lutsk NTU (KPEFK LNTU). It manages users (students, teachers, administration), academic groups, classroom inventory, and provides integration with the EDBO national education registry (ЄДЕБО). Student and teacher records are synchronized from EDBO on a daily schedule and can also be triggered manually via the API.

---

## Main capabilities

- **Authentication** — session-based auth, Google OAuth 2.0, two-factor authentication (2FA), password recovery
- **Role-based access control** — seven roles from `STUDENT` to `ADMINISTRATOR`
- **Students** — full profile synchronized from EDBO, document fields (RNOKPP, passport, student ticket)
- **Teachers (Staff)** — full profile synchronized from EDBO, position, faculty, department
- **Academic groups** — derived from student data during EDBO sync; curator assignment managed locally
- **Group history** — tracks why and when a student moved between groups
- **Classrooms** — classroom inventory with photos and Google Drive passport PDF
- **EDBO synchronization** — incremental daily cron sync + manual trigger endpoints (admin only)
- **Google Drive** — file storage via service account (classroom passport PDFs)
- **Email** — SMTP delivery for 2FA codes, password reset, account verification

---

## Tech stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [NestJS](https://nestjs.com/) | ^11 | Core framework |
| [Prisma](https://www.prisma.io/) | ^7 | ORM |
| [PostgreSQL](https://www.postgresql.org/) | 17 | Primary database |
| [Redis](https://redis.io/) | 7 | Session store (`connect-redis`) |
| [Bun](https://bun.sh/) | >=1.3.10 | Package manager / runtime |
| [TypeScript](https://www.typescriptlang.org/) | ^5.9 | Language |
| [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling) | ^6 | Cron jobs |
| [Swagger](https://swagger.io/) | ^11 | API docs at `/docs` |
| [Docker Compose](https://www.docker.com/) | — | Local PostgreSQL + Redis |
| [argon2](https://github.com/ranisalt/node-argon2) | ^0.44 | Password hashing |

---

## Project structure

```
src/
├── auth/               # Session auth, Google OAuth, 2FA, password recovery
│   ├── guards/         # AuthGuard, RolesGuard, ProviderGuard
│   ├── decorators/     # @Authorization(), @Roles(), @Authorized()
│   ├── password-recovery/
│   ├── provider/       # Google OAuth
│   └── two-factor-auth/
├── user/               # User profile, password change
├── admin/              # Admin user management
├── student/            # Student-specific endpoints
├── staff/              # Teacher-specific endpoints
├── groups/             # Groups, curator assignment, transfer history
├── classroom/          # Classroom inventory, photos, Google Drive PDFs
├── edbo/
│   ├── core/           # EdboService: HTTP client, OAuth token management
│   ├── sync/           # EdboSyncService: incremental sync, SyncState, cron + manual trigger
│   ├── entrance/       # Admission campaign API (DTO wrappers for EDBO)
│   ├── students/       # Student education history and exam API
│   └── listeners/      # External listeners API
├── libs/
│   ├── common/         # Shared utilities and decorators
│   ├── google-drive/   # Google Drive service account integration
│   └── mail/           # @nestjs-modules/mailer + React Email templates
├── prisma/             # PrismaService (global singleton)
└── config/             # Config loaders: mailer, OAuth providers, reCAPTCHA
```

```
prisma/
└── schema.prisma       # Single source of truth for the database schema
docker-compose.yml      # Starts PostgreSQL (port 5433) and Redis (port 6379)
.env.example            # All required environment variables with descriptions
```

---

## User roles

Defined in `prisma/schema.prisma` as the `UserRole` enum:

| Role | Description |
|------|-------------|
| `STUDENT` | Student |
| `TEACHER` | Teacher |
| `SCHEDULE_DISPATCHER` | Schedule dispatcher |
| `HEAD_OF_DEPARTMENT` | Head of department |
| `DEPUTY_DIRECTOR` | Deputy director |
| `DIRECTOR` | Director |
| `ADMINISTRATOR` | Full system access |

---

## Prerequisites

- **Bun** >= 1.3.10 (or Node.js >= 24.14.0)
- **Docker** and Docker Compose (for local PostgreSQL + Redis)
- **EDBO API access** — a license key, login, and password for the ЄДЕБО REST API proxy
- **Google Cloud project** — OAuth 2.0 credentials and a service account for Google Drive
- **SMTP credentials** — any SMTP server (e.g. Gmail app password)

---

## Environment setup

Copy `.env.example` to `.env` and fill in all variables:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|----------|-------------|
| `APPLICATION_PORT` | Server port (default `4000`) |
| `POSTGRES_URI` | Full PostgreSQL connection URI |
| `REDIS_HOST` / `REDIS_PASSWORD` | Redis connection |
| `SESSION_SECRET` / `COOKIES_SECRET` | Session and cookie signing secrets |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 |
| `GOOGLE_DRIVE_CLIENT_EMAIL` / `GOOGLE_DRIVE_PRIVATE_KEY` | Google Drive service account |
| `EDEBO_CODE` | Institution code in EDBO (e.g. `563`) |
| `EDBO_BASE_URL` / `EDBO_APP_KEY` | EDBO API proxy URL and license key |
| `EDBO_USER_LOGIN` / `EDBO_USER_PASSWORD` | EDBO account credentials |
| `MAIL_HOST` / `MAIL_PASSWORD` | SMTP configuration |

See [`.env.example`](.env.example) for the full list with descriptions.

---

## Installation and local development

```bash
# 1. Install dependencies
bun install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Start PostgreSQL and Redis
docker compose up -d

# 4. Run database migrations
bunx prisma migrate deploy

# 5. Generate Prisma client
bunx prisma generate

# 6. Start in development mode (watch)
bun run start:dev
```

The server starts at `http://localhost:4000` (or the port set in `APPLICATION_PORT`).

**Production build:**

```bash
bun run build
bun run start:prod
```

---

## Database and Prisma

Schema: [`prisma/schema.prisma`](prisma/schema.prisma)

```bash
# Create a new migration after changing schema.prisma
bunx prisma migrate dev --name <migration-name>

# Apply migrations in production / CI
bunx prisma migrate deploy

# Regenerate Prisma client (after schema changes)
bunx prisma generate

# Open Prisma Studio (local GUI)
bunx prisma studio
```

**Rule:** every change to `schema.prisma` must be accompanied by a migration. Never edit schema without running `migrate dev` locally first.

---

## EDBO synchronization

EDBO (ЄДЕБО) is the national education registry. This backend synchronizes student and teacher records from it.

**What is synchronized:**
- `Student` records — from `/api/studentEducations/list` using `modifyDate` for incremental sync
- `Teacher` records — from `/api/university/staff/list` using `dateLastChange` for incremental sync
- Student documents (RNOKPP, passport, student ticket) — backfilled separately for records missing them

**Where the logic lives:** `src/edbo/sync/edbo-sync.service.ts`, `src/edbo/sync/sync-state.service.ts`

**Cron:** runs daily at 02:00 (`EVERY_DAY_AT_2AM`). Students, staff, and document backfill run in parallel. A failure in one does not stop the others.

**Incremental sync state:** last successful run timestamps are stored in the `SyncState` table (`students_last_sync_at`, `staff_last_sync_at`). These are updated **only after a successful sync** — a failed run does not advance the cursor.

**Overlap window:** 10 minutes are subtracted from the last sync timestamp when filtering records. This compensates for clock drift between the application server and EDBO.

**Manual trigger** (admin only): three `POST` endpoints under `/edbo/sync/`:

| Endpoint | Description |
|----------|-------------|
| `POST /edbo/sync/students` | Sync students only |
| `POST /edbo/sync/staff` | Sync staff only |
| `POST /edbo/sync/all` | Full sync (students + staff + documents) |

**Important:** sync uses `upsert` operations and deliberately does not overwrite locally managed attributes (e.g. `Group.curatorId`). Any change to sync logic must account for this.

---

## Development guidelines

- **Schema changes require migrations.** Never modify `prisma/schema.prisma` without running `bunx prisma migrate dev`.
- **Read related files before editing sync.** Sync logic touches `SyncState`, `Student`, `Teacher`, `Group`, and `StudentGroupHistory`. Understand all dependencies before making changes.
- **Do not overwrite local attributes with sync data.** `Group.curatorId` and other manually managed fields must stay protected in upsert operations.
- **Group records are derived from sync.** Groups are created automatically when students are synced — they are not manually created entities.
- **Prefer simple, production-safe solutions.** Avoid adding queues, caches, or new infrastructure unless the problem cannot be solved without it.
- **Avoid large refactors in a single change.** Make focused, reviewable commits. Refactoring is a separate task from feature work.
- **Logging:** use `new Logger(ClassName.name)` — not `console.log`.

---

## Useful commands

```bash
# Development
bun run start:dev          # Start with file watching
bun run start:debug        # Start with debugger

# Production
bun run build              # Compile to dist/
bun run start:prod         # Run compiled output

# Code quality
bun run lint               # ESLint with auto-fix
bun run format             # Prettier

# Tests
bun run test               # Unit tests
bun run test:cov           # With coverage report
bun run test:e2e           # End-to-end tests

# Prisma
bunx prisma migrate dev --name <name>   # Create migration
bunx prisma migrate deploy              # Apply migrations
bunx prisma generate                    # Regenerate client
bunx prisma studio                      # Open GUI
```

---

## API documentation

Swagger UI is available at runtime:

```
http://localhost:4000/docs
```

---

## Contact

- **Email**: [s.tymchenko@kpefk.com.ua](mailto:s.tymchenko@kpefk.com.ua)
- **Organization**: [KPEFK LNTU](https://kpefk.com.ua)

---

> This README describes the current state of the repository. Keep it aligned with the actual codebase — if a module is added or removed, update the relevant sections here.
