import { auth } from "../auth"
import prisma from "../lib/db"
import { redirect } from "next/navigation"
import { Mail, Clock, User as UserIcon, Tag } from "lucide-react"
import Link from "next/link"
import { Sidebar } from "../components/organisms/Sidebar"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { inbox?: string; email?: string }
}) {
  const session = await auth()
  if (!session || !session.user) redirect("/login")

  const userRole = (session.user as any).role || "VIEWER"
  const userId = (session.user as any).id

  // Fetch accessible inboxes
  let inboxes: any[] = []
  if (userRole === "ADMIN") {
    inboxes = await prisma.mailCredential.findMany()
  } else {
    const access = await prisma.userInboxAccess.findMany({
      where: { userId },
      include: { credential: true }
    })
    inboxes = access.map(a => a.credential)
  }

  const selectedInboxId = searchParams.inbox || inboxes[0]?.credentialId
  const selectedInbox = inboxes.find((i) => i.credentialId === selectedInboxId)

  // Fetch emails for the selected inbox
  const emails = selectedInbox
    ? await prisma.caughtEmail.findMany({
        where: { credentialId: selectedInboxId },
        orderBy: { createdAt: "desc" }
      })
    : []

  const selectedEmailId = searchParams.email
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
          <h2 className="font-semibold">Messages</h2>
          <span className="text-xs text-text-muted">{emails.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {emails.map((email: any) => (
            <Link
              key={email.emailId}
              href={`/?inbox=${selectedInboxId}&email=${email.emailId}`}
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
              <div className="text-xs text-text-muted truncate">{email.bodyText?.substring(0, 100)}</div>
            </Link>
          ))}
          {emails.length === 0 && (
            <div className="p-8 text-center text-text-muted text-sm italic">
              No emails caught yet.
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col bg-bg-card overflow-hidden">
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border-subtle">
              <h1 className="text-2xl font-bold text-text-main mb-4">{selectedEmail.subject}</h1>
              <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                <span className="text-text-muted flex items-center gap-1"><UserIcon size={14} /> From:</span>
                <span className="font-medium text-text-main">{selectedEmail.sender}</span>
                <span className="text-text-muted flex items-center gap-1"><Clock size={14} /> Date:</span>
                <span className="text-text-main">{new Date(selectedEmail.createdAt).toLocaleString()}</span>
                <span className="text-text-muted flex items-center gap-1"><Tag size={14} /> To:</span>
                <span className="text-text-main">{selectedEmail.recipient}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 text-text-main">
              {selectedEmail.bodyHtml ? (
                <div 
                  className="prose prose-slate dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }} 
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-text-main">
                  {selectedEmail.bodyText}
                </pre>
              )}

              {attachments.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border-subtle">
                  <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                    Attachments ({attachments.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att: any) => (
                      <div key={att.attachmentId} className="flex items-center gap-2 p-2 border border-border-subtle rounded bg-bg-main hover:bg-bg-sidebar transition-colors cursor-pointer">
                        <span className="text-sm text-brand-primary font-medium">{att.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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
