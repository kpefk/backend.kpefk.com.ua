import 'dotenv/config'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'argon2'

const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URI })
const prisma = new PrismaClient({ adapter })

// ── Конфігурація адміністратора ───────────────────────────────────

const ADMIN_CONFIG = {
  email: 's.tycmhenko@kpefk.com.ua',
  password: 'testAdmin',
} as const

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting the database seeding process...\n')

  await seedAdministrator()

  console.log('\n✅ Сідінг завершено успішно.')
}

async function seedAdministrator() {
  console.log('👤 Seeding administrator...')

  const hashedPassword = await hash(ADMIN_CONFIG.password)

  const { user, created } = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: ADMIN_CONFIG.email },
    })

    if (existing) {
      // Оновлюємо пароль і роль якщо юзер вже існує
      const updated = await tx.user.update({
        where: { email: ADMIN_CONFIG.email },
        data: {
          password: hashedPassword,
          role: UserRole.ADMINISTRATOR,
          isActive: true,
        },
      })
      return { user: updated, created: false }
    }

    const created = await tx.user.create({
      data: {
        email: ADMIN_CONFIG.email,
        password: hashedPassword,
        role: UserRole.ADMINISTRATOR,
        isActive: true,
        isFirstLogin: true,
        isTwoFactorEnabled: false,
      },
    })
    return { user: created, created: true }
  })

  if (created) {
    console.log(`  ✔ Created administrator: ${user.email}`)
  } else {
    console.log(`  ↺ Updated existing administrator: ${user.email}`)
  }

  console.log(`  🔑 Password: ${ADMIN_CONFIG.password}`)
  console.log(`  🆔 ID: ${user.id}`)
  console.log(`  📋 Role: ${user.role}`)
}



// ── Entry point ───────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('\n❌ Помилка під час сідінгу:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })