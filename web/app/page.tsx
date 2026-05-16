import { auth, signOut } from "@/auth"
import db from "@/lib/db"
import { redirect } from "next/navigation"
import { Mail, Settings, LogOut, User, Inbox, Clock, User as UserIcon, Tag } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { inbox?: string; email?: string }
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const userRole = (session.user as any).role
  const userId = (session.user as any).id

  // Fetch accessible inboxes
  let inboxes: any[] = []
  if (userRole === "ADMIN") {
    inboxes = db.prepare("SELECT * FROM mail_credentials").all()
  } else {
    inboxes = db.prepare(`
      SELECT mc.* FROM mail_credentials mc
      JOIN user_inbox_access uia ON mc.credential_id = uia.credential_id
      WHERE uia.user_id = ?
    `).all(userId)
  }

  const selectedInboxId = searchParams.inbox || inboxes[0]?.credential_id
  const selectedInbox = inboxes.find((i) => i.credential_id === selectedInboxId)

  // Fetch emails for the selected inbox
  const emails = selectedInbox
    ? db.prepare("SELECT * FROM caught_emails WHERE credential_id = ? ORDER BY created_at DESC").all(selectedInboxId)
    : []

  const selectedEmailId = searchParams.email
  const selectedEmail = selectedEmailId 
    ? db.prepare("SELECT * FROM caught_emails WHERE email_id = ?").get(selectedEmailId) as any
    : null

  const attachments = selectedEmail
    ? db.prepare("SELECT * FROM attachments WHERE entity_id = ?").all(selectedEmail.email_id)
    : []

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b flex items-center gap-2 font-bold text-xl text-blue-600">
          <Mail size={24} />
          <span>Mail Catcher</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Inbox size={14} /> Inboxes
          </h2>
          <div className="space-y-1">
            {inboxes.map((inbox) => (
              <Link
                key={inbox.credential_id}
                href={`/?inbox=${inbox.credential_id}`}
                className={`block p-2 rounded text-sm ${
                  selectedInboxId === inbox.credential_id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {inbox.smtp_user}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4 border-t space-y-2">
          {userRole === "ADMIN" && (
            <Link href="/settings" className="flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          )}
          <div className="flex items-center gap-2 p-2 text-sm text-gray-600">
            <UserIcon size={16} />
            <span className="truncate">{session.user?.name}</span>
          </div>
          <form action={async () => {
            'use server'
            await signOut()
          }}>
            <button className="flex items-center gap-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded w-full text-left">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </div>

      {/* Email List */}
      <div className="w-96 bg-white border-r flex flex-col flex-shrink-0 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold">Messages</h2>
          <span className="text-xs text-gray-500">{emails.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {emails.map((email: any) => (
            <Link
              key={email.email_id}
              href={`/?inbox=${selectedInboxId}&email=${email.email_id}`}
              className={`block p-4 border-b hover:bg-gray-50 transition-colors ${
                selectedEmailId === email.email_id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-gray-900 truncate flex-1 mr-2">{email.sender}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-gray-600 font-medium truncate mb-1">{email.subject}</div>
              <div className="text-xs text-gray-400 truncate">{email.body_text}</div>
            </Link>
          ))}
          {emails.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm italic">
              No emails caught yet.
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedEmail.subject}</h1>
              <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                <span className="text-gray-500 flex items-center gap-1"><UserIcon size={14} /> From:</span>
                <span className="font-medium">{selectedEmail.sender}</span>
                <span className="text-gray-500 flex items-center gap-1"><Clock size={14} /> Date:</span>
                <span>{new Date(selectedEmail.created_at).toLocaleString()}</span>
                <span className="text-gray-500 flex items-center gap-1"><Tag size={14} /> To:</span>
                <span>{selectedEmail.recipient}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {selectedEmail.body_html ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} 
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-gray-800">
                  {selectedEmail.body_text}
                </pre>
              )}

              {attachments.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    Attachments ({attachments.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att: any) => (
                      <div key={att.attachment_id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm text-blue-600 font-medium">{att.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <Mail size={48} className="mb-4 opacity-20" />
            <p>Select an email to read its content</p>
          </div>
        )}
      </div>
    </div>
  )
}
