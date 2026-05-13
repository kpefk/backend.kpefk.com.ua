# MyKPEFK — Server

> Backend of the enterprise educational management system for **KPEFK LNTU**

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Contact](#contact)

---

## About

**MyKPEFK** is the server-side of the enterprise information system for Kovel Industrial and Economic Vocational College of Lutsk NTU (KPEFK LNTU).

The system automates key college processes: user management (students, teachers, administration), classroom inventory, integration with the EDBO registry, and email notifications.

---

## Features

- 🔐 **Authentication** — Google OAuth 2.0, two-factor authentication (2FA), password recovery
- 👥 **User Management** — role-based access control (student, teacher, administrator, etc.)
- 🏫 **Classrooms** — classroom inventory management
- 📊 **EDBO** — integration with the Unified State Electronic Database on Education
- 📁 **Google Drive** — file storage via a service account
- 📧 **Email** — SMTP email delivery (verification, 2FA, password reset)
- 🔒 **Sessions** — Redis-backed session management

---

## Tech Stack

| Technology                                    | Version  | Purpose                  |
| --------------------------------------------- | -------- | ------------------------ |
| [NestJS](https://nestjs.com/)                 | ^11      | Core framework           |
| [Prisma](https://www.prisma.io/)              | ^7       | ORM for PostgreSQL       |
| [PostgreSQL](https://www.postgresql.org/)     | 17       | Relational database      |
| [Redis](https://redis.io/)                    | 7        | Session store & cache    |
| [Docker](https://www.docker.com/)             | —        | Service containerization |
| [Bun](https://bun.sh/)                        | >=1.3.10 | Package manager          |
| [TypeScript](https://www.typescriptlang.org/) | ^5.9     | Programming language     |
| [Swagger](https://swagger.io/)                | ^11      | API documentation        |

---

## Project Structure

```
mykpefk-server/
├── src/
│   ├── admin/              # Admin module
│   ├── auth/               # Authentication (OAuth, 2FA, password recovery)
│   │   ├── password-recovery/
│   │   ├── provider/       # Google OAuth
│   │   └── two-factor-auth/
│   ├── classroom/          # Classroom module
│   ├── config/             # Configurations (mailer, recaptcha, providers)
│   ├── edbo/               # EDBO integration
│   │   ├── entrance/       # Admission campaign
│   │   └── listeners/      # EDBO listeners
│   ├── libs/
│   │   ├── common/         # Shared utilities and decorators
│   │   ├── google-drive/   # Google Drive integration
│   │   └── mail/           # Email service
│   ├── prisma/             # Prisma service
│   └── user/               # User module
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed data
├── docker-compose.yml      # PostgreSQL + Redis
├── .env.example            # Environment variables template
└── package.json
```

---

## Quick Start

### Requirements

- [Bun](https://bun.sh/) >= 1.3.10 or [Node.js](https://nodejs.org/) >= 24
- [Docker](https://www.docker.com/) and Docker Compose

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/KPEFK-LNTU/mykpefk-server.git
cd mykpefk-server

# 2. Install dependencies
bun install

# 3. Copy and fill in the environment variables
cp .env.example .env

# 4. Start PostgreSQL and Redis via Docker
docker compose up -d

# 5. Run database migrations
bunx prisma migrate deploy

# 6. (Optional) Seed the database with initial data
bunx prisma db seed

# 7. Start the server in development mode
bun run start:dev
```

The server will be available at: `http://localhost:4000`

---

## Configuration

Copy `.env.example` → `.env` and fill in all required variables:

```bash
cp .env.example .env
```

Key variables:

| Variable                                                 | Description                             |
| -------------------------------------------------------- | --------------------------------------- |
| `APPLICATION_PORT`                                       | Application port (default `4000`)       |
| `POSTGRES_URI`                                           | PostgreSQL connection URI               |
| `REDIS_HOST` / `REDIS_PASSWORD`                          | Redis connection parameters             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`              | Google OAuth credentials                |
| `GOOGLE_DRIVE_CLIENT_EMAIL` / `GOOGLE_DRIVE_PRIVATE_KEY` | Google Drive service account            |
| `EDBO_BASE_URL` / `EDBO_APP_KEY`                         | EDBO integration parameters             |
| `MAIL_HOST` / `MAIL_PASSWORD`                            | SMTP configuration                      |

For a full description of every variable, see [`.env.example`](.env.example).

---

## API Documentation

Once the server is running, Swagger UI is available at:

```
http://localhost:4000/docs
```

---

## Contact

For questions about the project:

- 📧 **Email**: [s.tymchenko@kpefk.com.ua](mailto:s.tymchenko@kpefk.com.ua)
- 🏫 **Organization**: [KPEFK LNTU](https://kpefk.com.ua)
