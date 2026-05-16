import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminUsername = 'admin'
  const adminPassword = 'admin'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  // Create default Admin user
  const admin = await prisma.webUser.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  })

  // Create default SMTP credential
  await prisma.mailCredential.upsert({
    where: { smtpUser: 'admin' },
    update: {},
    create: {
      smtpUser: 'admin',
      smtpPassword: 'admin',
    },
  })

  console.log('Seed successful: Admin user and SMTP credential initialized.')
  console.log('User:', admin.username)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
