Тепер я бачу повну картину. Файл `SKILL.md` — це шаблон skill для **Next.js документації**, і тебе просять адаптувати його під твій **NestJS/Prisma backend репозиторій** [kpefk/backend.kpefk.com.ua](https://github.com/kpefk/backend.kpefk.com.ua). 

Ось адаптований `SKILL.md` для твого проєкту:

***

```markdown
---
name: update-docs
description: This skill should be used when the user asks to "update documentation for my changes", "check docs for this PR", "what docs need updating", "sync docs with code", "scaffold docs for this feature", "document this feature", "review docs completeness", "add docs for this change", "what documentation is affected", "docs impact", or mentions "CLAUDE.md", "README.md", "API documentation", "Prisma schema", "NestJS module". Provides guided workflow for updating backend.kpefk.com.ua documentation based on code changes.
metadata:
  internal: true
---

# backend.kpefk.com.ua Documentation Updater

Guides you through updating documentation based on code changes on the active branch. Designed for maintainers reviewing PRs in the NestJS + Prisma + PostgreSQL backend.

## Quick Start

1. **Analyze changes**: Run `git diff main...HEAD --stat` to see what files changed
2. **Identify affected docs**: Map changed source files to documentation paths
3. **Review each doc**: Walk through updates with user confirmation
4. **Validate**: Run `bun lint` to check formatting
5. **Commit**: Stage documentation changes

## Workflow: Analyze Code Changes

### Step 1: Get the diff

```bash
# See all changed files on this branch
git diff main...HEAD --stat

# See changes in specific areas
git diff main...HEAD -- src/
git diff main...HEAD -- prisma/
```

### Step 2: Identify documentation-relevant changes

Look for changes in these areas:

| Source Path                     | Likely Doc Impact                        |
| ------------------------------- | ---------------------------------------- |
| `src/modules/`                  | Module API reference in CLAUDE.md        |
| `src/common/`                   | Shared utilities / guards / decorators   |
| `src/auth/`                     | Authentication flow in README.md         |
| `prisma/schema.prisma`          | Database schema section in CLAUDE.md     |
| `prisma/migrations/`            | Migration notes in CLAUDE.md             |
| `docker-compose.yml`            | Local dev setup in README.md             |
| `.env.example`                  | Environment variables section in README  |
| `src/main.ts`                   | App bootstrap / Swagger config           |

### Step 3: Map to documentation files

Primary documentation files:

- `src/modules/**` → `CLAUDE.md` (Architecture section)
- `prisma/schema.prisma` → `CLAUDE.md` (Database Models section)
- `docker-compose.yml`, `.env.example` → `README.md` (Setup section)
- `src/auth/**` → `README.md` + `CLAUDE.md` (Auth section)

## Workflow: Update Existing Documentation

### Step 1: Read the current documentation

Before making changes, read `CLAUDE.md` and `README.md` to understand:

- Current module list and their responsibilities
- Prisma models documented
- Environment variables listed in `.env.example`

### Step 2: Identify what needs updating

Common updates include:

- **New NestJS module**: Add to the modules table in `CLAUDE.md`
- **New Prisma model**: Document fields and relations in `CLAUDE.md`
- **New endpoint**: Add to the API reference section
- **New env variable**: Add to `.env.example` and README
- **Changed auth flow**: Update auth section with new guards/strategies
- **New Redis/Queue usage**: Document in architecture overview

### Step 3: Apply updates with confirmation

For each change:

1. Show the user what you plan to change
2. Wait for confirmation before editing
3. Apply the edit
4. Move to the next change

### Step 4: Check for shared content

If a module has both a controller and service, document them together:

## ModuleName Module

**Controller**: `src/modules/module-name/module-name.controller.ts`
**Service**: `src/modules/module-name/module-name.service.ts`

| Endpoint     | Method | Guard       | Description       |
| ------------ | ------ | ----------- | ----------------- |
| `/resource`  | GET    | JwtGuard    | Get all resources |
| `/resource`  | POST   | RolesGuard  | Create resource   |
```

### Step 5: Validate changes

```bash
bun lint          # Check formatting
bun prettier:fix  # Auto-fix formatting issues
```

## Workflow: Scaffold New Module Documentation

Use this when adding documentation for entirely new NestJS modules.

### Step 1: Determine the doc type

| Feature Type         | Doc Location             | Section              |
| -------------------- | ------------------------ | -------------------- |
| New NestJS module    | `CLAUDE.md`              | Modules Architecture |
| New Prisma model     | `CLAUDE.md`              | Database Models      |
| New auth strategy    | `CLAUDE.md` + `README.md`| Authentication       |
| New Docker service   | `README.md`              | Local Development    |
| New env variable     | `.env.example` + README  | Configuration        |
| New Swagger tag      | `CLAUDE.md`              | API Reference        |

### Step 2: Document a new module

Use this template in `CLAUDE.md`:

```markdown
## ModuleName Module

Brief description of what this module does.

### Endpoints

| Endpoint            | Method | Auth Required | Description             |
| ------------------- | ------ | ------------- | ----------------------- |
| `/module-name`      | GET    | Yes (JWT)     | List all resources      |
| `/module-name/:id`  | GET    | Yes (JWT)     | Get single resource     |
| `/module-name`      | POST   | Admin only    | Create new resource     |
| `/module-name/:id`  | PATCH  | Admin only    | Update resource         |
| `/module-name/:id`  | DELETE | Admin only    | Delete resource         |

### Prisma Models Used

- `ModelName` — description of relation

### DTOs

- `CreateModuleNameDto` — fields: `field1 (string, required)`, `field2 (number, optional)`
- `UpdateModuleNameDto` — extends `PartialType(CreateModuleNameDto)`
```

### Step 3: Document a new Prisma model

```markdown
### ModelName

| Field       | Type     | Description              |
| ----------- | -------- | ------------------------ |
| `id`        | String   | UUID primary key         |
| `createdAt` | DateTime | Auto-set on create       |
| `updatedAt` | DateTime | Auto-updated             |
| `fieldName` | String   | Description of the field |

**Relations**: `ModelName` has many `RelatedModel`
```

### Step 4: Add environment variable

```bash
# .env.example
NEW_SERVICE_URL=http://localhost:3001   # Description of what this does
NEW_SERVICE_API_KEY=your_api_key_here   # How to obtain this key
```

## Documentation Conventions

### Quick Reference

**Module documentation header:**

```markdown
## ModuleName Module
**Path**: `src/modules/module-name/`
**Description**: One sentence describing purpose.
```

**Endpoint table format:**

```markdown
| Endpoint | Method | Guard | Description |
| -------- | ------ | ----- | ----------- |
```

**Prisma relation notes:**

```markdown
> **Note**: `ModelA` → `ModelB` is a one-to-many relation via `modelAId` foreign key.
```

**Notes format:**

```markdown
> **Important**: Single line note about breaking change or gotcha.

> **Note**:
> - Multi-line note point 1
> - Multi-line note point 2
```

## Validation Checklist

Before committing documentation changes:

- [ ] New NestJS modules added to modules table in `CLAUDE.md`
- [ ] New Prisma models documented with fields and relations
- [ ] New environment variables added to `.env.example` with comments
- [ ] New endpoints listed with HTTP method, auth, and description
- [ ] Docker service changes reflected in README setup section
- [ ] `bun lint` passes
- [ ] No secrets or real credentials in `.env.example`

## References

- `CLAUDE.md` — Architecture, modules, Prisma models, auth flows
- `README.md` — Setup, local dev, deployment instructions
- `prisma/schema.prisma` — Source of truth for data models
- `.env.example` — Required environment variables
- `docker-compose.yml` — Local services configuration
```