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
  await seedCurriculumDomain()

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



// ── Curriculum domain seed ────────────────────────────────────────

async function seedCurriculumDomain() {
  console.log('\n📚 Seeding curriculum domain (specialties + OPP)...')

  // Specialties — based on real college curricula (F3.pdf, D3.pdf)
  const specialties = [
    {
      code: 'F3',
      name: "Комп'ютерні науки",
      shortName: 'КН',
    },
    {
      code: 'D3',
      name: 'Менеджмент',
      shortName: 'МН',
    },
  ]

  const createdSpecialties: Record<string, string> = {}

  for (const s of specialties) {
    const specialty = await prisma.specialty.upsert({
      where: { code: s.code },
      update: { name: s.name, shortName: s.shortName },
      create: { code: s.code, name: s.name, shortName: s.shortName, isActive: true },
    })
    createdSpecialties[s.code] = specialty.id
    console.log(`  ✔ Specialty: [${specialty.code}] ${specialty.name}`)
  }

  // Educational programs — one per specialty (can add more later)
  const programs = [
    {
      specialtyCode: 'F3',
      name: "Комп'ютерні науки",
      qualificationName: "Фаховий молодший бакалавр з комп'ютерних наук",
      qualificationLevel: 'Фаховий молодший бакалавр',
      approvalDate: new Date('2025-05-26'),
      approvalOrderNumber: 'Протокол № 6 від 26.05.2025',
    },
    {
      specialtyCode: 'D3',
      name: 'Менеджмент',
      qualificationName: 'Фаховий молодший бакалавр з менеджменту',
      qualificationLevel: 'Фаховий молодший бакалавр',
      approvalDate: new Date('2025-05-26'),
      approvalOrderNumber: 'Протокол № 6 від 26.05.2025',
    },
  ]

  for (const p of programs) {
    const specialtyId = createdSpecialties[p.specialtyCode]
    if (!specialtyId) continue

    // Upsert by name + specialtyId (no unique constraint on name, so check manually)
    const existing = await prisma.educationalProgram.findFirst({
      where: { specialtyId, name: p.name },
    })

    if (existing) {
      await prisma.educationalProgram.update({
        where: { id: existing.id },
        data: {
          qualificationName: p.qualificationName,
          qualificationLevel: p.qualificationLevel,
          approvalDate: p.approvalDate,
          approvalOrderNumber: p.approvalOrderNumber,
          isActive: true,
        },
      })
      console.log(`  ↺ Updated OPP: ${p.name}`)
    } else {
      await prisma.educationalProgram.create({
        data: {
          specialtyId,
          name: p.name,
          qualificationName: p.qualificationName,
          qualificationLevel: p.qualificationLevel,
          approvalDate: p.approvalDate,
          approvalOrderNumber: p.approvalOrderNumber,
          isActive: true,
        },
      })
      console.log(`  ✔ Created OPP: ${p.name}`)
    }
  }
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