# MyKPEFK — Server

> Backend of the enterprise educational management system for **KPEFK LNTU**

[![NestJS](https://img.shields.io/badge/NestJS-v12-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

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

**MyKPEFK** is the server-side of the information system for Kovel Industrial and Economic Vocational College of Lutsk NTU (KPEFK LNTU). It covers the full academic cycle: admissions, contingent management, curriculum planning, teacher load, timetabling, the electronic attendance and grade journal, and diploma issuance — plus integration with the EDBO national education registry (ЄДЕБО). Student and teacher records are synchronized from EDBO on a daily schedule and can also be triggered manually via the API.

The API surface is roughly **330 routes**, registered by 26 feature modules.
Every route requires authentication by default; see
[Security model](#security-model).

---

## Main capabilities

### Identity and access

- **Authentication** — session-based auth, Google OAuth 2.0, two-factor authentication (2FA: TOTP + email), password recovery
- **Role-based access control** — seven roles from `STUDENT` to `ADMINISTRATOR`; routes are closed by default
- **Rate limiting** — global limit on every route, stricter limits on login, password recovery, EDBO sync and uploads

### Contingent

- **Students** — full profile synchronized from EDBO, document fields (RNOKPP, passport, student ticket), corporate email
- **Teachers (Staff)** — profile from EDBO, position, faculty, department, rate (up to 1.5), qualification upgrades and attestation tracking
- **Academic groups** — derived from student data during EDBO sync; curator assignment managed locally
- **Group history** — tracks why and when a student moved between groups
- **Group leader (curator) workspace** — group roster, parent contact records, audit log, export
- **Subgroups** — splitting a group for practical/lab sessions
- **Admissions** — annual EDBO snapshots of offers and applications, reports, PII purge on archival

### Academic planning

- **Curriculum domain** — specialties, educational programs, curricula with versioning, sections, components, terms, time budget, academic calendar, elective blocks, group curriculum assignments
- **Curriculum import** — parsing curricula from `.xls` workbooks with preview before commit
- **Working curricula** — operational layer for specific academic year, with approval workflow (pedagogical council + trade union)
- **Individual plans** — per-student individual study plans
- **Teacher load** — subject/lesson assignment generation from working curricula, order confirmation workflow, per-teacher load summary with 720×rate hour limit validation
- **Electives** — elective block seasons, offerings catalog, student selection (voluntary + assigned), admin management with auto-assign, group stats, enrollment lists, annual campaigns with progress tracking
- **Schedule** — timetable generation and management for the schedule dispatcher

### Academic process

- **Attendance and grades journal** — lesson sessions, attendance records, 12-point grading, date → parity/term resolution, role-based editing windows
- **Grade sheets (відомості)** — generated DOCX statements per group and discipline
- **Rating** — student rating calculation and reports
- **Surveys** — survey management with CRUD and result aggregation
- **Credit recognition** — recognition of previously earned credits
- **Academic mobility** — academic mobility records
- **Diplomas** — EDBO ODM XML import, consolidated grade sheet, diploma and supplement generation from per-specialty DOCX templates

### Integrations and operations

- **EDBO synchronization** — incremental daily cron sync + manual trigger endpoints (admin only); students, staff, study programs, university info
- **Google Workspace / Drive / Classroom** — corporate email provisioning, file storage via service account
- **Email** — SMTP delivery for 2FA codes, password reset, account verification (React Email templates)
- **Health checks** — `GET /health` reporting PostgreSQL and Redis state for orchestrator probes
- **Startup config validation** — Zod schema; a missing or malformed variable aborts the boot

---

## Tech stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [NestJS](https://nestjs.com/) | ^12 | Core framework |
| [Prisma](https://www.prisma.io/) | ^7 | ORM |
| [@prisma/adapter-pg](https://www.npmjs.com/package/@prisma/adapter-pg) | ^7.5 | Driver adapter (explicit `pg` pool) |
| [pg](https://node-postgres.com/) | ^8.20 | PostgreSQL driver |
| [PostgreSQL](https://www.postgresql.org/) | 17 | Primary database |
| [Redis](https://redis.io/) | 7 | Session store |
| [connect-redis](https://github.com/tj/connect-redis) | ^9 | Redis session store adapter |
| [ioredis](https://github.com/redis/ioredis) | ^5 | Redis client |
| [express-session](https://github.com/expressjs/session) | ^1.19 | Session middleware |
| [cookie-parser](https://github.com/expressjs/cookie-parser) | ^1.4 | Cookie parsing |
| [Bun](https://bun.sh/) | >=1.3.10 | Package manager / runtime |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Language |
| [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling) | ^12 | Cron jobs |
| [@nestjs/throttler](https://docs.nestjs.com/security/rate-limiting) | ^6.5 | Rate limiting (global guard) |
| [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus) | ^12 | Health checks at `/health` |
| [helmet](https://helmetjs.github.io/) | ^8.2 | Security headers |
| [zod](https://zod.dev/) | ^4.6 | Environment variable validation |
| [Swagger](https://swagger.io/) | ^12 | API docs at `/docs` (dev only) |
| [Docker Compose](https://www.docker.com/) | — | Local PostgreSQL + Redis |
| [argon2](https://github.com/ranisalt/node-argon2) | ^0.44 | Password hashing |
| [class-validator](https://github.com/typestack/class-validator) | ^0.15 | DTO validation |
| [class-transformer](https://github.com/typestack/class-transformer) | ^0.5 | DTO transformation |
| [multer](https://www.npmjs.com/package/multer) | ^2.2 | File uploads (size-limited) |
| [React Email](https://react.email/) | ^1 | Email templates |
| [googleapis](https://www.npmjs.com/package/googleapis) | ^171 | Google Workspace / Drive / OAuth |
| [otplib](https://www.npmjs.com/package/otplib) | ^12 | TOTP 2FA |
| [qrcode](https://www.npmjs.com/package/qrcode) | ^1.5 | QR code generation for TOTP |
| [@nestlab/google-recaptcha](https://www.npmjs.com/package/@nestlab/google-recaptcha) | ^3.11 | reCAPTCHA validation |
| [docx](https://www.npmjs.com/package/docx) / [docxtemplater](https://docxtemplater.com/) | ^9.7 / ^3.69 | Grade sheets, diploma generation |
| [xlsx](https://www.npmjs.com/package/xlsx) | ^0.18 | Curriculum `.xls` import |
| [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) | ^5.9 | EDBO ODM XML parsing |
| [Jest](https://jestjs.io/) | ^30 | Unit tests (ESM runtime) |

---

## Project structure

```
src/
├── auth/                   # Session auth, Google OAuth, 2FA, password recovery
│   ├── guards/             # AuthGuard, RolesGuard, AuthProviderGuard
│   ├── decorators/         # @Authorization(), @Roles(), @Authorized(), @Public()
│   ├── password-recovery/
│   ├── provider/           # Google OAuth
│   └── two-factor-auth/
├── user/                   # User profile, password and email change
├── admin/                  # Admin user management, dashboard statistics
├── student/                # Student-specific endpoints, corporate email provisioning
├── staff/                  # Teachers, qualification upgrades, attestations
├── groups/                 # Groups, curator assignment, transfer history
├── group-leader/           # Curator workspace: roster, parent info, audit log
├── subgroups/              # Group splitting for practical/lab sessions
├── classroom/              # Classroom inventory, photos, Google Drive PDFs
├── curriculum/             # Full curriculum domain
│   ├── specialties/        # Specialty CRUD
│   ├── educational-programs/ # Educational program (OPP) CRUD
│   ├── curricula/          # Curriculum container CRUD
│   ├── curriculum-versions/ # Versions, sections, components, terms, projections
│   ├── working-curricula/  # Working curriculum + component terms for academic year
│   ├── group-assignments/  # Group ↔ curriculum version binding
│   ├── individual-plans/   # Per-student individual study plans
│   ├── import/             # Curriculum import from .xls workbooks
│   └── teacher-load/       # Subject/lesson assignment generation, confirmation
├── electives/              # Elective catalog, selection, campaigns
│   ├── electives.controller.ts        # Season/offering/selection management
│   └── elective-seasons.controller.ts # Campaigns, group confirmation, student blocks
├── schedule/               # Timetable generation and management
├── attendance/             # Electronic journal: lesson sessions, attendance records
├── grades/                 # 12-point grading, grade sheets (відомості) as DOCX
├── rating/                 # Student rating calculation and reports
├── surveys/                # Survey management and result aggregation
├── credit-recognition/     # Recognition of previously earned credits
├── academic-mobility/      # Academic mobility records
├── diploma/                # EDBO XML import, diploma + supplement generation
├── admissions/             # Admission campaign snapshots and reports
├── health/                 # /health — PostgreSQL + Redis probes
├── edbo/
│   ├── core/               # EdboService: HTTP client, OAuth token management
│   ├── sync/               # EdboSyncService: incremental sync, SyncState, cron
│   ├── entrance/           # Admission campaign API (DTO wrappers for EDBO)
│   ├── students/           # Student education history and exam API
│   ├── university/         # University info API
│   ├── accreditation/      # Accreditation data API
│   ├── dictionary/         # EDBO dictionary endpoints
│   ├── documents/          # EDBO document endpoints
│   ├── persons/            # EDBO person endpoints
│   └── listeners/          # External listeners API
├── libs/
│   ├── common/             # Utilities, decorators, filters, upload limits
│   ├── google-drive/       # Google Drive service account integration
│   ├── google-workspace/   # Corporate account provisioning
│   ├── google-classroom/   # Google Classroom integration
│   └── mail/               # @nestjs-modules/mailer + React Email templates
├── prisma/                 # PrismaService (global singleton, explicit pool size)
├── config/                 # redis, mailer, OAuth providers, reCAPTCHA, env schema
└── main.ts                 # Application entry point
```

```
prisma/
├── schema.prisma           # Single source of truth for the database schema (68 models)
├── seed.ts                 # Database seed script
└── migrations/             # Prisma migration files
.github/workflows/ci.yml    # CI: typecheck, lint, test, build
prisma.config.ts            # Prisma config (schema path, seed command, datasource)
docker-compose.yml          # Starts PostgreSQL (port 5433) and Redis (port 6379)
.env.example                # All required environment variables with descriptions
```

---

## User roles

Defined in `prisma/schema.prisma` as the `UserRole` enum:

| Role | Description |
|------|-------------|
| `STUDENT` | View own data, select electives |
| `TEACHER` | View own load and qualifications |
| `SCHEDULE_DISPATCHER` | Manage schedule |
| `HEAD_OF_DEPARTMENT` | Department oversight |
| `DEPUTY_DIRECTOR` | Generate teacher load, manage curricula |
| `DIRECTOR` | Confirm teacher load orders, approve working curricula |
| `ADMINISTRATOR` | Full system access |

---

## Security model

### Routes are closed by default

`AuthGuard` is bound globally via `APP_GUARD`, so **every route requires a valid
session unless it is explicitly marked `@Public()`**. Forgetting a decorator now
fails closed (401) instead of silently exposing an endpoint.

```ts
@Authorization(UserRole.ADMINISTRATOR)   // AuthGuard + RolesGuard
@Authorization()                          // AuthGuard only — any signed-in user
@Public()                                 // opt out of the global guard
```

`@Authorization(...roles)` adds `RolesGuard` on top. A bare `@Roles()` without
`UseGuards(RolesGuard)` is **not** enforced — always go through
`@Authorization()`.

The public allowlist is intentionally small: login, register, logout, the two
password-recovery routes, the OAuth connect/callback pair, the email-change
confirmation link, `/health`, and the two Google Drive proxy routes that serve
classroom photos and passport PDFs to `<img>`/`<embed>` without credentials.

### Rate limiting

`ThrottlerGuard` is also global, ahead of `AuthGuard`, so floods are rejected
before any database lookup.

| Scope | Limit |
|-------|-------|
| Default (all routes) | 60 / min |
| Login, register, password recovery, email-change request | 5 / min |
| EDBO sync (`/edbo/sync/*`) | 5 / min |
| Email-change confirmation link | 10 / min |
| File uploads (6 endpoints) | 20 / min |
| Classroom photo proxy | 120 / min |
| Classroom passport proxy | 60 / min |
| `/health` | 300 / min |

Per-route overrides use `@Throttle()` alone — do **not** add
`@UseGuards(ThrottlerGuard)` next to it, or the request is counted twice and the
effective limit is halved.

### Other protections

- **Uploads** are capped by `multer` `limits.fileSize` (see
  [`src/libs/common/upload-limits.ts`](src/libs/common/upload-limits.ts)).
  `MaxFileSizeValidator` alone is not enough — it runs only after the whole file
  is already buffered in memory.
- **Validation** — global `ValidationPipe` with `whitelist` and
  `forbidNonWhitelisted` (mass-assignment protection, data minimisation).
- **Secrets** — `SESSION_SECRET` and `COOKIES_SECRET` must be at least 32 chars;
  a short secret is a warning in development and fatal in production.
- **Security headers** — `helmet`. `crossOriginResourcePolicy` is deliberately
  `cross-origin`: the frontend lives on another origin and loads classroom media
  directly.
- **Swagger** is exposed in development only.
- **reCAPTCHA** guards login, register and password recovery.

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
| `Schedule` / `ScheduleEntry` | Generated timetable and its individual slots |
| `LessonSession` | A held lesson — the anchor of the electronic journal |
| `AttendanceRecord` | Per-student attendance and 12-point grade for a session |
| `StudentSubgroup` | Group split for practical and lab sessions |
| `Diploma` / `DiplomaTemplate` | Diploma order imported from EDBO, and its DOCX template |
| `ParentInfo` / `AuditLog` | Curator-maintained parent contacts and change trail |
| `SyncState` | Key-value cursors for incremental EDBO sync |

> The schema currently defines **68 models**; the table lists the load-bearing
> ones. [`prisma/schema.prisma`](prisma/schema.prisma) is the source of truth.

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
| `POST /edbo/sync/university` | Sync institution info (also runs weekly, Mon 03:00) |

These endpoints are rate limited to 5 requests per minute: a full pass costs
thousands of HTTP calls to EDBO, and concurrent runs can exhaust the quota on
the EDBO side.

**Important:** sync uses `upsert` operations and deliberately does not overwrite locally managed attributes (e.g. `Group.curatorId`). Any change to sync logic must account for this.

---

## Prerequisites

- **Bun** >= 1.3.10 (or Node.js >= 24.15.0)
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
| `AUTH_SECRET` | Optional. Key for encrypting TOTP secrets; falls back to `SESSION_SECRET` |
| `DATABASE_POOL_MAX` | Optional. Max DB connections per instance (default `10`) |

See [`.env.example`](.env.example) for the full list with descriptions.

**Variables are validated at startup** against the Zod schema in
[`src/config/env.validation.ts`](src/config/env.validation.ts). A missing or
malformed value aborts the boot with an explicit message — for example:

```
Error: Config validation error: MAIL_LOGIN: MAIL_LOGIN має бути email-адресою
```

When adding a new variable, add it to the schema as well, otherwise it stays
unvalidated.

---

## Installation and local development

```bash
# 1. Install dependencies
bun install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Start PostgreSQL and Redis
docker compose up -d

# 4. Generate the Prisma client (types are not committed to the repo)
bunx prisma generate

# 5. Run database migrations
bunx prisma migrate deploy

# 6. Start in development mode (watch)
bun run start:dev
```

The server starts at `http://localhost:4000` (or the port set in `APPLICATION_PORT`).

Verify it came up correctly:

```bash
curl http://localhost:4000/health
```

Swagger UI is then available at `http://localhost:4000/docs`.

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

# Apply migrations in production
bun run migrate:deploy

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
| Auth | `/auth/` | Login, register, logout, profile |
| 2FA | `/auth/2fa/` | TOTP setup/verify/disable, email 2FA |
| OAuth | `/auth/oauth/` | Google connect and callback |
| Password recovery | `/auth/password-recovery/` | Reset request, new password |
| Users | `/users/` | Profile, password and email change |
| Admin | `/admin/` | User management, dashboard statistics |
| Students | `/students/` | Student list, details, corporate email |
| Staff | `/staff/` | Teachers, qualification upgrades, attestations |
| Attestations | `/attestations/` | Attestation tracker |
| Groups | `/groups/` | Groups, curator assignment |
| Group leader | `/group-leader/` | Curator roster, parent info, export |
| Subgroups | `/subgroups/` | Practical/lab subgroup management |
| Classrooms | `/classrooms/` | CRUD, photos, passport PDF |
| Specialties | `/specialties/` | Specialty management |
| Educational Programs | `/educational-programs/` | OPP management |
| Curricula | `/curricula/` | Curriculum container CRUD |
| Curriculum import | `/curricula/import/` | `.xls` preview and commit |
| Curriculum structure | `/curriculum-versions/`, `/curriculum-sections/`, `/curriculum-components/`, `/curriculum-component-terms/`, `/curriculum-component-projections/`, `/elective-blocks/`, `/time-budget-entries/`, `/academic-calendar-entries/` | Version content |
| Working Curricula | `/working-curricula/`, `/working-component-terms/` | Operational plans for an academic year |
| Group Curriculum Assignments | `/group-curriculum-assignments/` | Group ↔ curriculum binding |
| Individual plans | `/individual-plans/` | Per-student study plans |
| Teacher Load | `/teacher-load/` | Load summaries, assignments, confirmation |
| Electives | `/electives/` | Catalog, selections, campaigns |
| Schedule | `/schedule/` | Timetable generation and management |
| Attendance | `/attendance/` | Lesson sessions, attendance, summary |
| Grades | `/grades/` | Grades and grade sheets (відомості) |
| Rating | `/rating/` | Student rating |
| Surveys | `/surveys/` | Surveys and results |
| Credit recognition | `/credit-recognitions/` | Recognition of earned credits |
| Academic mobility | `/academic-mobility/` | Mobility records |
| Diplomas | `/diplomas/`, `/diploma-templates/` | Import, generation, templates |
| Admissions | `/admissions/` | Admission campaign reports and sync |
| EDBO Sync | `/edbo/sync/` | Manual sync triggers |
| University | `/university/` | Institution info from EDBO |
| Entrance | `/entrance/` | EDBO admission campaign API (admin only) |
| Health | `/health/` | Liveness/readiness probe (public) |

Full interactive documentation is available at Swagger UI (`/docs`) — **in
development only**; it is not mounted in production.

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
- **Routes are closed by default.** A new controller needs `@Authorization(...)`;
  only add `@Public()` when the endpoint is genuinely meant to be reachable
  without a session, and say why in a comment.
- **CI must stay green.** `typecheck`, `lint`, `test` and `build` all block the
  merge, and lint is currently at **zero** problems — keep it there. Run
  `bun run lint:ci` locally before pushing.
- **New environment variables go into the Zod schema** as well as `.env.example`.
- **Before "fixing" an audit finding, check reachability.** Some advisories in
  `bun audit` point at packages that are only reachable from build tooling, or
  at a templating engine this project does not use. Updating them blind can
  break unrelated code.

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
bun run lint:ci            # ESLint without auto-fix (fails on any problem)
bun run typecheck          # tsc --noEmit
bun run format             # Prettier

# Tests
bun run test               # Unit tests
bun run test:cov           # With coverage report
bun run test:e2e           # End-to-end tests

# Prisma
bunx prisma migrate dev --name <name>   # Create migration
bun run migrate:deploy                  # Apply migrations (production)
bunx prisma generate                    # Regenerate client
bunx prisma studio                      # Open GUI
bunx prisma db seed                     # Seed database
```

---

## Deployment

### Continuous integration

Every pull request and every push to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
with four independent blocking jobs: **typecheck**, **lint**, **test**, **build**.
A red job blocks the merge. Each job runs `bunx prisma generate` first — the
`@prisma/client` types are generated and are not committed to the repository.

### Release steps

There is no deployment artifact (no Dockerfile) in this repository yet, so the
steps below describe deploying the compiled output directly onto a host.

```bash
bun install --frozen-lockfile   # Reproducible install from bun.lock
bunx prisma generate            # Generate the Prisma client
bun run migrate:deploy          # Apply pending migrations (never `migrate dev`)
bun run build                   # Compile to dist/
bun run start:prod              # node dist/main
```

### Runtime requirements

- **Environment variables are validated at startup** against the Zod schema in
  [`src/config/env.validation.ts`](src/config/env.validation.ts). A missing or
  malformed variable aborts the boot with an explicit message instead of
  failing later on the first request that needs it.
- **PostgreSQL and Redis must be reachable.** Redis is required: the session
  store lives there, and the app intentionally fails fast without it.
- **Send `SIGTERM` to stop.** `app.enableShutdownHooks()` is enabled, so Prisma
  closes its connections and in-flight requests are drained. `SIGKILL` skips
  this.

### Health check

`GET /health` is public and reports the state of both dependencies:

```bash
curl http://localhost:4000/health
```

- `200` — all dependencies are up.
- `503` — at least one is down; the JSON body names it.

Point the orchestrator's liveness/readiness probe at this endpoint. It is rate
limited at 300 requests per minute, well above normal probe frequency.

---

## API documentation

Swagger UI is generated from the controllers and their DTOs:

```
http://localhost:4000/docs
```

It is mounted **only when `NODE_ENV=development`**, so the full API surface is
not exposed in production. To document a new endpoint, annotate it with
`@ApiOperation` / `@ApiResponse` — there is no separate spec file to maintain.

---

## Contact

- **Email**: [s.tymchenko@kpefk.com.ua](mailto:s.tymchenko@kpefk.com.ua)
- **Organization**: [KPEFK LNTU](https://kpefk.com.ua)

---

> This README describes the current state of the repository. Keep it aligned with the actual codebase — if a module is added or removed, update the relevant sections here.
