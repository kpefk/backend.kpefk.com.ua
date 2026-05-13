import 'dotenv/config'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'argon2'

const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URI })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting the database seeding process...')

  const email = 's.tycmhenko@kpefk.com.ua'
  const plainPassword = 'testAdmin'
  const hashedPassword = await hash(plainPassword)

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log(`User with email ${email} already exists.`)
  } else {
    const adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: UserRole.ADMINISTRATOR,
        isActive: true,
      }
    })

    console.log(`Successfully created administrator: ${adminUser.email}`)
    console.log(`Temporary password: ${plainPassword}`)
  }

  console.log('Сідінг завершено успішно.')
}

main()
  .catch(e => {
    console.error('Помилка під час сідінгу:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
