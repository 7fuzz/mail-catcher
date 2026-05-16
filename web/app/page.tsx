import { auth } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import { Mail, Clock, User as UserIcon, Tag } from "lucide-react"
import Link from "next/link"
import { Sidebar } from "@/components/organisms/Sidebar"
import { EmailListControls } from "@/components/molecules/EmailListControls"
import { EmailDisplay } from "@/components/organisms/EmailDisplay"
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
    
    const where = inboxId === 'all' 
      ? (userRole === 'ADMIN' ? {} : { credentialId: { in: inboxes.map(i => i.credentialId) } })
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
    <div className="flex h-screen bg-bg-main overflow-hidden text-text-main">
      <Sidebar 
        inboxes={inboxes} 
        selectedInboxId={selectedInboxId} 
        user={session.user} 
        isAdmin={userRole === "ADMIN"} 
      />

      {/* Email List */}
      <div className="w-96 bg-bg-card border-r border-border-subtle flex flex-col flex-shrink-0 overflow-hidden">
        <div className="p-4 border-b border-border-subtle bg-bg-sidebar flex justify-between items-center">
          <h2 className="font-semibold text-brand-primary">{isAllInboxes ? 'All Inboxes' : 'Messages'}</h2>
          <span className="text-xs text-text-muted">{totalEmails} total</span>
        </div>
        
        <EmailListControls 
          totalPages={totalPages} 
          currentPage={currentPage} 
          onClearInbox={clearInbox}
          selectedInboxId={selectedInboxId as string}
        />

        <div className="flex-1 overflow-y-auto">
          {emails.map((email: any) => {
            const currentParams = new URLSearchParams()
            if (selectedInboxId) currentParams.set('inbox', selectedInboxId)
            currentParams.set('email', email.emailId)
            if (searchTerm) currentParams.set('search', searchTerm)
            if (currentPage > 1) currentParams.set('page', currentPage.toString())

            return (
              <Link
                key={email.emailId}
                href={`/?${currentParams.toString()}`}
                className={`block p-4 border-b border-border-subtle hover:bg-bg-main transition-colors ${
                  selectedEmailId === email.emailId ? "bg-brand-primary/5 border-l-4 border-l-brand-primary" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold text-text-main truncate flex-1 mr-2">{email.sender}</span>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm text-text-main font-medium truncate mb-1">{email.subject}</div>
                <div className="text-xs text-text-muted truncate line-clamp-2">{email.bodyText?.substring(0, 100)}</div>
                {isAllInboxes && (
                  <div className="mt-2 text-[10px] text-brand-primary/70 font-medium uppercase tracking-tighter">
                    Inbox: {inboxes.find(i => i.credentialId === email.credentialId)?.smtpUser || 'Unknown'}
                  </div>
                )}
              </Link>
            )
          })}
          {emails.length === 0 && (
            <div className="p-8 text-center text-text-muted text-sm italic">
              {searchTerm ? "No emails match your search." : "No emails caught yet."}
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col bg-bg-card overflow-hidden">
        {selectedEmail ? (
          <EmailDisplay 
            email={selectedEmail} 
            attachments={attachments} 
            onDelete={deleteEmail}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-bg-main">
            <Mail size={48} className="mb-4 opacity-20" />
            <p>Select an email to read its content</p>
          </div>
        )}
      </div>
    </div>
  )
}
