import { auth } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import SettingsClient from "./SettingsClient"
import bcrypt from "bcryptjs"

export default async function SettingsPage() {
  const session = await auth()
  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    redirect("/")
  }

  const credentials = await prisma.mailCredential.findMany({
    include: { _count: { select: { emails: true } } }
  })
  const webUsers = await prisma.webUser.findMany({
    include: { inboxAccess: { include: { credential: true } } }
  })

  // --- Server Actions ---

  async function handleInboxSubmit(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    const user = formData.get("user") as string
    const pass = formData.get("pass") as string
    const maxEmails = parseInt(formData.get("maxEmails") as string) || 100
    const maxSizeMb = parseInt(formData.get("maxSizeMb") as string) || 50
    const isActive = formData.get("isActive") === "true"

    if (id) {
      const data: any = { smtpUser: user, maxEmails, maxSizeMb, isActive }
      if (pass && pass !== "********") data.smtpPassword = pass
      await prisma.mailCredential.update({ where: { credentialId: id }, data })
    } else {
      await prisma.mailCredential.create({
        data: { smtpUser: user, smtpPassword: pass, maxEmails, maxSizeMb, isActive }
      })
    }
    revalidatePath("/settings")
  }

  async function deleteCredential(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    await prisma.mailCredential.delete({ where: { credentialId: id } })
    revalidatePath("/settings")
  }

  async function handleUserSubmit(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    const username = formData.get("username") as string
    const role = formData.get("role") as string
    const password = formData.get("password") as string
    const inboxIdsJson = formData.get("inboxIds") as string
    const inboxIds: string[] = inboxIdsJson ? JSON.parse(inboxIdsJson) : []

    const data: any = { username, role }
    if (password) data.passwordHash = await bcrypt.hash(password, 10)

    if (id) {
      // Update User
      await prisma.$transaction(async (tx) => {
        await tx.webUser.update({ where: { id }, data });
        
        // Sync access (Only if role is MAILBOX, admins have full access regardless)
        if (role === 'MAILBOX') {
          await tx.userInboxAccess.deleteMany({ where: { userId: id } });
          if (inboxIds.length > 0) {
            await tx.userInboxAccess.createMany({
              data: inboxIds.map(cid => ({ userId: id, credentialId: cid }))
            });
          }
        } else {
          // If promoted to Admin, clear specific access as it's redundant
          await tx.userInboxAccess.deleteMany({ where: { userId: id } });
        }
      });
    } else {
      // Create User
      const hashedPassword = await bcrypt.hash(password, 10)
      await prisma.$transaction(async (tx) => {
        const newUser = await tx.webUser.create({
          data: { username, passwordHash: hashedPassword, role }
        });
        
        if (role === 'MAILBOX' && inboxIds.length > 0) {
          await tx.userInboxAccess.createMany({
            data: inboxIds.map(cid => ({ userId: newUser.id, credentialId: cid }))
          });
        }
      });
    }
    revalidatePath("/settings")
  }

  async function deleteWebUser(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    if (id === (session?.user as any).id) return;
    await prisma.webUser.delete({ where: { id } })
    revalidatePath("/settings")
  }

  return (
    <SettingsClient 
      credentials={credentials}
      webUsers={webUsers}
      onInboxSubmit={handleInboxSubmit}
      onUserSubmit={handleUserSubmit}
      onDeleteCredential={deleteCredential}
      onDeleteUser={deleteWebUser}
      currentUserId={(session.user as any).id}
    />
  )
}
