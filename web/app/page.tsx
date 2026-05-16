import { auth } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { EmailListControls } from "@/components/molecules/EmailListControls"
import { EmailDisplay } from "@/components/organisms/EmailDisplay"
import { DashboardClient } from "@/components/templates/DashboardClient"
import { revalidatePath } from "next/cache"
import fs from 'fs'
import path from 'path'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ inbox?: string; email?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const session = await auth()
  if (!session || !session.user) redirect("/login")

  const userRole = (session.user as any).role || "VIEWER"
  const userId = (session.user as any).id

  // --- Server Actions ---
  
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '../smtp-service/attachments')

  async function deleteEmail(formData: FormData) {
    'use server'
    const emailId = formData.get("emailId") as string
    
    const email = await prisma.caughtEmail.findUnique({
      where: { emailId },
      include: { attachments: true }
    })

    if (email) {
      // Delete physical files
      email.attachments.forEach(att => {
        const fileName = path.basename(att.url)
        const filePath = path.join(UPLOAD_DIR, fileName)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      })

      await prisma.caughtEmail.delete({ where: { emailId } })
    }
    revalidatePath("/")
  }

  async function clearInbox(formData: FormData) {
    'use server'
    const inboxId = formData.get("inboxId") as string
    
    // Fetch accessible inboxes to build the where clause
    let accessibleInboxes: any[] = []
    if (userRole === "ADMIN") {
        accessibleInboxes = await prisma.mailCredential.findMany()
    } else {
        const access = await prisma.userInboxAccess.findMany({
            where: { userId },
            include: { credential: true }
        })
        accessibleInboxes = access.map(a => a.credential)
    }

    const where = inboxId === 'all' 
      ? (userRole === 'ADMIN' ? {} : { credentialId: { in: accessibleInboxes.map(i => i.credentialId) } })
      : { credentialId: inboxId }

    const emails = await prisma.caughtEmail.findMany({
      where,
      include: { attachments: true }
    })

    // Delete physical files
    emails.forEach(email => {
      email.attachments.forEach(att => {
        const fileName = path.basename(att.url)
        const filePath = path.join(UPLOAD_DIR, fileName)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      })
    })

    await prisma.caughtEmail.deleteMany({ where })
    revalidatePath("/")
  }

  // Fetch accessible inboxes with counts and sizes
  let rawInboxes: any[] = []
  if (userRole === "ADMIN") {
    rawInboxes = await prisma.mailCredential.findMany({
      include: {
        emails: {
          select: {
            credentialId: true,
            bodyText: true,
            bodyHtml: true,
            attachments: { select: { size: true } }
          }
        }
      }
    })
  } else {
    const access = await prisma.userInboxAccess.findMany({
      where: { userId },
      include: {
        credential: {
          include: {
            emails: {
              select: {
                credentialId: true,
                bodyText: true,
                bodyHtml: true,
                attachments: { select: { size: true } }
              }
            }
          }
        }
      }
    })
    rawInboxes = access.map(a => a.credential)
  }

  const inboxes = rawInboxes.map(inbox => {
    let totalBytes = 0
    inbox.emails.forEach((email: any) => {
      totalBytes += (email.bodyText?.length || 0) + (email.bodyHtml?.length || 0)
      email.attachments.forEach((att: any) => {
        totalBytes += att.size
      })
    })
    
    return {
      ...inbox,
      usedSizeMb: (totalBytes / (1024 * 1024)).toFixed(2),
      emailCount: inbox.emails.length
    }
  })

  const selectedInboxId = (Array.isArray(params.inbox) ? params.inbox[0] : params.inbox) || inboxes[0]?.credentialId
  
  // Logic for 'All Inboxes'
  const isAllInboxes = selectedInboxId === 'all'
  const accessibleInboxIds = inboxes.map(i => i.credentialId)
  
  const selectedInbox = isAllInboxes 
    ? { credentialId: 'all', smtpUser: 'All Inboxes' }
    : inboxes.find((i) => i.credentialId === selectedInboxId)

  // Search and Pagination parameters
  const searchTerm = (Array.isArray(params.search) ? params.search[0] : params.search) || ""
  const currentPage = parseInt((Array.isArray(params.page) ? params.page[0] : params.page) || "1")
  const pageSize = 20

  // Build where clause for filtering
  const whereClause: any = {
    credentialId: isAllInboxes ? { in: accessibleInboxIds } : selectedInboxId,
  }

  if (searchTerm) {
    whereClause.OR = [
      { sender: { contains: searchTerm } },
      { recipient: { contains: searchTerm } },
      { subject: { contains: searchTerm } },
      { bodyText: { contains: searchTerm } },
      { bodyHtml: { contains: searchTerm } },
    ]
  }

  // Fetch total count for pagination
  const totalEmails = (isAllInboxes || selectedInbox)
    ? await prisma.caughtEmail.count({ where: whereClause })
    : 0
  const totalPages = Math.ceil(totalEmails / pageSize)

  // Fetch emails for the selected inbox with pagination and search
  const emails = (isAllInboxes || selectedInbox)
    ? await prisma.caughtEmail.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      })
    : []

  const selectedEmailId = Array.isArray(params.email) ? params.email[0] : params.email
  const selectedEmail = selectedEmailId 
    ? await prisma.caughtEmail.findUnique({
        where: { emailId: selectedEmailId },
        include: { attachments: true }
      })
    : null

  const attachments = selectedEmail?.attachments || []

  return (
    <DashboardClient 
      inboxes={inboxes}
      selectedInboxId={selectedInboxId as string}
      user={session.user}
      isAdmin={userRole === "ADMIN"}
      totalEmails={totalEmails}
      isAllInboxes={isAllInboxes}
      emails={emails}
      selectedEmailId={selectedEmailId}
      selectedEmail={selectedEmail}
      attachments={attachments}
      searchTerm={searchTerm}
      currentPage={currentPage}
      totalPages={totalPages}
      onClearInbox={clearInbox}
      onDeleteEmail={deleteEmail}
    />
  )
}
