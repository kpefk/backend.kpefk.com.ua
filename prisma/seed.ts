// Побічний ефект імпорту: вантажить env-файли поточного тіра (`.env.<tier>`,
// потім базовий `.env`). Через `dotenv/config` тут читався лише базовий `.env`,
// тобто `NODE_ENV=test prisma db seed` засівав би DEV-базу.
import '../src/config/environment'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URI })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting the database seeding process...\n')

  await seedCurriculumDomain()

  console.log('\n✅ Сідінг завершено успішно.')
}

async function seedCurriculumDomain() {
  console.log('\n📚 Seeding curriculum domain (specialties + OPP)...')

  // Specialties — based on real college curricula (F3.pdf, D3.pdf)
  // normativeEcts — обсяг ОПП зі стандарту ФПО за спеціальністю (розд. 3 стандарту).
  // Заклад веде власні коди ('F3', 'D3'), тому зіставлення з кодом переліку
  // (Постанова КМУ № 266) зафіксоване тут явно.
  const specialties = [
    {
      code: 'F3',
      name: "Комп'ютерні науки",
      shortName: 'КН',
      normativeEcts: 180,
      standardReference:
        'Стандарт ФПО, спеціальність 122 «Комп’ютерні науки» — 180 кредитів ЄКТС',
    },
    {
      code: 'D3',
      name: 'Менеджмент',
      shortName: 'МН',
      normativeEcts: 150,
      standardReference:
        'Стандарт ФПО, спеціальність 073 «Менеджмент» — 150 кредитів ЄКТС',
    },
  ]

  const createdSpecialties: Record<string, string> = {}

  for (const s of specialties) {
    const specialty = await prisma.specialty.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        shortName: s.shortName,
        normativeEcts: s.normativeEcts,
        standardReference: s.standardReference,
      },
      create: {
        code: s.code,
        name: s.name,
        shortName: s.shortName,
        isActive: true,
        normativeEcts: s.normativeEcts,
        standardReference: s.standardReference,
      },
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