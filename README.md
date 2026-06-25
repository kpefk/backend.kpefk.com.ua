# MyKPEFK — Server

> Backend of the enterprise educational management system for **KPEFK LNTU**

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

Copyright (C) 2026  Tymchenko Serhii

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the GNU Affero General Public License for more details.

## Project overview

**MyKPEFK** is the server-side of the information system for Kovel Industrial and Economic Vocational College of Lutsk NTU (KPEFK LNTU). It manages users (students, teachers, administration), academic groups, classroom inventory, curricula, teacher load assignments, electives, and provides integration with the EDBO national education registry (ЄДЕБО). Student and teacher records are synchronized from EDBO on a daily schedule and can also be triggered manually via the API.

---

## Main capabilities

- **Authentication** — session-based auth, Google OAuth 2.0, two-factor authentication (2FA: TOTP + email), password recovery
- **Role-based access control** — seven roles from `STUDENT` to `ADMINISTRATOR`
- **Students** — full profile synchronized from EDBO, document fields (RNOKPP, passport, student ticket), corporate email
- **Teachers (Staff)** — full profile synchronized from EDBO, position, faculty, department, rate (up to 1.5), qualification upgrades tracking
- **Academic groups** — derived from student data during EDBO sync; curator assignment managed locally
- **Group history** — tracks why and when a student moved between groups
- **Classrooms** — classroom inventory with photos and Google Drive passport PDF
- **Curriculum domain** — specialties, educational programs, curricula with versioning, sections, components, terms, time budget, academic calendar, elective blocks, group curriculum assignments
- **Working curricula** — operational layer for specific academic year, with approval workflow (pedagogical council + trade union)
- **Teacher load** — subject/lesson assignment generation from working curricula, order confirmation workflow, per-teacher load summary with 720×rate hour limit validation
- **Electives** — elective block seasons, offerings catalog, student selection (voluntary + assigned), admin management with auto-assign, group stats, enrollment lists, annual campaigns with progress tracking
- **EDBO synchronization** — incremental daily cron sync + manual trigger endpoints (admin only); student study programs sync
- **Google Drive** — file storage via service account (classroom passport PDFs)
- **Email** — SMTP delivery for 2FA codes, password reset, account verification

---

## Tech stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [NestJS](https://nestjs.com/) | ^11 | Core framework |
| [Prisma](https://www.prisma.io/) | ^7 | ORM |
| [PostgreSQL](https://www.postgresql.org/) | 17 | Primary database |
| [Redis](https://redis.io/) | 7 | Session store |
| [connect-redis](https://github.com/tj/connect-redis) | ^9 | Redis session store adapter |
| [ioredis](https://github.com/redis/ioredis) | ^5 | Redis client |
| [express-session](https://github.com/expressjs/session) | ^1.19 | Session middleware |
| [cookie-parser](https://github.com/expressjs/cookie-parser) | ^1.4 | Cookie parsing |
| [Bun](https://bun.sh/) | >=1.3.10 | Package manager / runtime |
| [TypeScript](https://www.typescriptlang.org/) | ^5.9 | Language |
| [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling) | ^6 | Cron jobs |
| [Swagger](https://swagger.io/) | ^11 | API docs at `/docs` |
| [Docker Compose](https://www.docker.com/) | — | Local PostgreSQL + Redis |
| [argon2](https://github.com/ranisalt/node-argon2) | ^0.44 | Password hashing |
| [class-validator](https://github.com/typestack/class-validator) | ^0.15 | DTO validation |
| [class-transformer](https://github.com/typestack/class-transformer) | ^0.5 | DTO transformation |
| [React Email](https://react.email/) | ^1 | Email templates |
| [googleapis](https://www.npmjs.com/package/googleapis) | ^171 | Google Drive + OAuth |
| [otplib](https://www.npmjs.com/package/otplib) | ^12 | TOTP 2FA |
| [qrcode](https://www.npmjs.com/package/qrcode) | ^1.5 | QR code generation for TOTP |
| [@nestlab/google-recaptcha](https://www.npmjs.com/package/@nestlab/google-recaptcha) | ^3.11 | reCAPTCHA validation |

---

## Project structure

```
src/
├── auth/                   # Session auth, Google OAuth, 2FA, password recovery
│   ├── guards/             # AuthGuard, RolesGuard, ProviderGuard
│   ├── decorators/         # @Authorization(), @Roles(), @Authorized()
│   ├── password-recovery/
│   ├── provider/           # Google OAuth
│   └── two-factor-auth/
├── user/                   # User profile, password change
├── admin/                  # Admin user management
├── student/                # Student-specific endpoints
├── staff/                  # Teacher-specific endpoints, qualification upgrades
├── groups/                 # Groups, curator assignment, transfer history
├── classroom/              # Classroom inventory, photos, Google Drive PDFs
├── curriculum/             # Full curriculum domain
│   ├── specialties/        # Specialty CRUD
│   ├── educational-programs/ # Educational program (OPP) CRUD
│   ├── curricula/          # Curriculum container CRUD
│   ├── curriculum-versions/ # Version management, sections, components, terms, projections
│   ├── working-curricula/  # Working curriculum + component terms for academic year
│   ├── group-assignments/  # Group ↔ curriculum version binding
│   └── teacher-load/       # Subject/lesson assignment generation, confirmation workflow
├── electives/              # Elective catalog, selection, admin management (v1 + v2)
│   ├── electives.controller.ts       # Season/offering/selection management
│   ├── electives.service.ts          # Core elective logic
│   ├── elective-seasons.controller.ts # Campaigns, group confirmation, student blocks
│   └── elective-seasons.service.ts   # Campaign lifecycle and progress
├── edbo/
│   ├── core/               # EdboService: HTTP client, OAuth token management
│   ├── sync/               # EdboSyncService: incremental sync, SyncState, cron + manual trigger
│   ├── entrance/           # Admission campaign API (DTO wrappers for EDBO)
│   ├── students/           # Student education history and exam API
│   ├── university/         # University staff API
│   ├── accreditation/      # Accreditation data API
│   ├── dictionary/         # EDBO dictionary endpoints
│   ├── documents/          # EDBO document endpoints
│   ├── persons/            # EDBO person endpoints
│   └── listeners/          # External listeners API
├── libs/
│   ├── common/             # Shared utilities and decorators
│   ├── google-drive/       # Google Drive service account integration
│   └── mail/               # @nestjs-modules/mailer + React Email templates
├── prisma/                 # PrismaService (global singleton)
├── config/                 # Config loaders: mailer, OAuth providers, reCAPTCHA
├── redis.config.ts         # Redis connection config
├── main.ts                 # Application entry point
```

```
prisma/
├── schema.prisma           # Single source of truth for the database schema
├── seed.ts                 # Database seed script
├── config.ts               # Prisma config (schema path, seed command)
└── migrations/             # Prisma migration files
docker-compose.yml          # Starts PostgreSQL (port 5433) and Redis (port 6379)
.env.example                # All required environment variables with descriptions
redis.config.ts             # Redis connection configuration
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

## Core domain entities

| Entity | Role |
|--------|------|
| `User` | Authenticated system actor |
| `Student` | Student linked to EDBO, bound to a group |
| `Teacher` | Pedagogical worker with rate (up to 1.5), qualification upgrades |
| `Group` | Academic group derived from EDBO sync |
| `Specialty` | Licensed specialty unit (e.g. F3 Computer Science) |
| `EducationalProgram` | Educational professional program (OPP) linked to a specialty |
| `Curriculum` | Curriculum container (unique per OPP × form × basis × year) |
| `CurriculumVersion` | Immutable version of a curriculum (sections, components, terms) |
| `WorkingCurriculum` | Operational plan for a specific academic year |
| `CurriculumComponentTerm` | Per-semester distribution of ECTS, hours, control form |
| `TeacherLoadSubjectAssignment` | Confirmed teaching load at component level |
| `TeacherLoadLessonAssignment` | Per-lesson-type detail with optional teacher override |
| `TeacherQualificationUpgrade` | Professional development record (auto-parsed from EDBO or manual) |
| `ElectiveBlockSeason` | Published elective block for a specific academic year |
| `ElectiveOffering` | Specific discipline available to students within a season |
| `StudentElectiveSelection` | Canonical record of student's elective choice |
| `Classroom` | Classroom inventory with photos and passport PDF |

---

## Curriculum domain

The curriculum domain is the backbone of academic planning:

1. **Specialty** → **Educational Program** → **Curriculum** → **Curriculum Version**
2. A version contains **Sections** (ЗСО, ЦЗП, ЦФП, etc.) with **Components** and **Elective Blocks**
3. Components have **Terms** per semester (ECTS, hours, control form)
4. **Working Curriculum** is the operational layer for a specific academic year, derived from a published version
5. **Group Curriculum Assignment** binds a group to a curriculum version
6. **Group Working Curriculum Assignment** binds a group to a working curriculum
7. **Teacher Load** is generated from working curriculum component terms and managed through subject/lesson assignments

### Teacher load workflow

1. Deputy director generates DRAFT subject assignments from a working curriculum
2. Primary teachers are assigned to subjects; lesson overrides can redirect specific lesson types
3. Director confirms assignments with order number and date → status becomes CONFIRMED
4. Validation: 720 × teacher.rate hour limit (hard block), order date after 01.09 (soft warn)

---

## User roles

- **STUDENT** — View own data, select electives
- **TEACHER** — View own load and qualifications
- **SCHEDULE_DISPATCHER** — Manage schedule
- **HEAD_OF_DEPARTMENT** — Department oversight
- **DEPUTY_DIRECTOR** — Generate teacher load, manage curricula
- **DIRECTOR** — Confirm teacher load orders, approve working curricula
- **ADMINISTRATOR** — Full system access

---

## EDBO synchronization

EDBO (ЄДЕБО) is the national education registry. This backend synchronizes student and teacher records from it.

**What is synchronized:**
- `Student` records — from `/api/studentEducations/list` using `modifyDate` for incremental sync
- `Teacher` records — from `/api/university/staff/list` using `dateLastChange` for incremental sync
- Student documents (RNOKPP, passport, student ticket) — backfilled separately for records missing them
- Educational programs — from `/api/universityStudyPrograms/list` with accreditation data

**Where the logic lives:** `src/edbo/sync/edbo-sync.service.ts`, `src/edbo/sync/sync-state.service.ts`

**Cron:** runs daily at 02:00 (`EVERY_DAY_AT_2AM`). Students, staff, and document backfill run in parallel. A failure in one does not stop the others.

**Incremental sync state:** last successful run timestamps are stored in the `SyncState` table (`students_last_sync_at`, `staff_last_sync_at`). These are updated **only after a successful sync** — a failed run does not advance the cursor.

**Overlap window:** 10 minutes are subtracted from the last sync timestamp when filtering records. This compensates for clock drift between the application server and EDBO.

**Manual trigger** (admin only): endpoints under `/edbo/sync/`:

| Endpoint | Description |
|----------|-------------|
| `POST /edbo/sync/students` | Sync students only |
| `POST /edbo/sync/staff` | Sync staff only |
| `POST /edbo/sync/all` | Full sync (students + staff + documents) |
| `POST /edbo/sync/study-programs` | Sync educational programs |

**Important:** sync uses `upsert` operations and deliberately does not overwrite locally managed attributes (e.g. `Group.curatorId`). Any change to sync logic must account for this.

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
| `SESSION_MAX_AGE` | Session lifetime (e.g. `30d`) |
| `ALLOWED_ORIGIN` | CORS allowed origin (frontend URL) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 |
| `GOOGLE_DRIVE_CLIENT_EMAIL` / `GOOGLE_DRIVE_PRIVATE_KEY` | Google Drive service account |
| `GOOGLE_DRIVE_FOLDER_ID` | Target Google Drive folder ID |
| `EDEBO_CODE` | Institution code in EDBO (e.g. `563`) |
| `EDBO_BASE_URL` / `EDBO_APP_KEY` | EDBO API proxy URL and license key |
| `EDBO_USER_LOGIN` / `EDBO_USER_PASSWORD` | EDBO account credentials |
| `MAIL_HOST` / `MAIL_PASSWORD` | SMTP configuration |
| `GOOGLE_RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3 secret |

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

# Seed the database
bunx prisma db seed
```

**Rule:** every change to `schema.prisma` must be accompanied by a migration. Never edit schema without running `migrate dev` locally first.

---

## API endpoints overview

| Namespace | Path prefix | Description |
|-----------|-------------|-------------|
| Auth | `/auth/` | Login, register, logout, profile, refresh, 2FA |
| Users | `/users/` | Profile, password change |
| Admin | `/admin/` | User management |
| Students | `/students/` | Student list and details |
| Staff | `/staff/` | Teachers, qualification upgrades |
| Groups | `/groups/` | Groups, curator assignment |
| Classrooms | `/classrooms/` | CRUD, photos, passport |
| Specialties | `/specialties/` | Specialty management |
| Educational Programs | `/educational-programs/` | OPP management |
| Curricula | `/curricula/` | Curriculum container CRUD |
| Curriculum Versions | `/curriculum-versions/` | Version management, sections, components, terms |
| Working Curricula | `/working-curricula/` | Operational plans, component terms, group assignments |
| Group Curriculum Assignments | `/group-curriculum-assignments/` | Group ↔ curriculum binding |
| Teacher Load | `/teacher-load/` | Load summaries, subject/lesson assignments, confirmation |
| Electives | `/electives/` | Catalog, selections, admin management (v1 + v2), campaigns |
| EDBO Sync | `/edbo/sync/` | Manual sync triggers |
| Entrance | `/entrance/` | Admission campaign |

Full interactive documentation available at Swagger UI (`/docs`).

---

## Development guidelines

- **Schema changes require migrations.** Never modify `prisma/schema.prisma` without running `bunx prisma migrate dev`.
- **Read related files before editing sync.** Sync logic touches `SyncState`, `Student`, `Teacher`, `Group`, and `StudentGroupHistory`. Understand all dependencies before making changes.
- **Do not overwrite local attributes with sync data.** `Group.curatorId` and other manually managed fields must stay protected in upsert operations.
- **Group records are derived from sync.** Groups are created automatically when students are synced — they are not manually created entities.
- **Curriculum versions are immutable after publishing.** Corrections require creating a new version, not overwriting.
- **Teacher load limit:** 720 × Teacher.rate hours per year (max 1080 for 1.5 rate). Enforced at confirmation time.
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
bunx prisma db seed                     # Seed database
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
