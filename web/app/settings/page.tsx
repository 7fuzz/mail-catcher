import { auth } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import { Trash2, Key, Mail, Plus, Edit2 } from "lucide-react"
import { revalidatePath } from "next/cache"
import { Button } from "@/components/atoms/Button"
import { Badge } from "@/components/atoms/Badge"
import { Select } from "@/components/atoms/Select"
import { Table, THead, TBody, TH, TR, TD } from "@/components/atoms/Table"
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
      // Update
      const data: any = { 
        smtpUser: user, 
        maxEmails, 
        maxSizeMb, 
        isActive 
      }
      if (pass && pass !== "********") data.smtpPassword = pass
      await prisma.mailCredential.update({ where: { credentialId: id }, data })
    } else {
      // Create
      await prisma.mailCredential.create({
        data: { smtpUser: user, smtpPassword: pass, maxEmails, maxSizeMb, isActive }
      })
    }
    revalidatePath("/settings")
  }

  async function deleteCredential(formData: FormData) {
    'use server'
    await prisma.mailCredential.delete({ where: { credentialId: formData.get("id") as string } })
    revalidatePath("/settings")
  }

  async function handleUserSubmit(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    const username = formData.get("username") as string
    const role = formData.get("role") as string
    const password = formData.get("password") as string

    if (id) {
      // Update
      const data: any = { username, role }
      if (password) data.passwordHash = await bcrypt.hash(password, 10)
      await prisma.webUser.update({ where: { id }, data })
    } else {
      // Create
      const hashedPassword = await bcrypt.hash(password, 10)
      await prisma.webUser.create({
        data: { username, passwordHash: hashedPassword, role }
      })
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

  async function grantAccess(formData: FormData) {
    'use server'
    await prisma.userInboxAccess.upsert({
      where: { userId_credentialId: { 
        userId: formData.get("userId") as string, 
        credentialId: formData.get("credentialId") as string 
      }},
      update: {},
      create: { 
        userId: formData.get("userId") as string, 
        credentialId: formData.get("credentialId") as string 
      }
    })
    revalidatePath("/settings")
  }

  async function revokeAccess(formData: FormData) {
    'use server'
    await prisma.userInboxAccess.delete({
      where: { userId_credentialId: { 
        userId: formData.get("userId") as string, 
        credentialId: formData.get("credentialId") as string 
      }}
    })
    revalidatePath("/settings")
  }

  // --- Render Functions ---

  const InboxTable = (onEdit: (inbox: any) => void) => (
    <Table>
      <THead>
        <TR>
          <TH>SMTP User</TH>
          <TH>Status</TH>
          <TH>Emails</TH>
          <TH>Storage</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {credentials.map((cred) => (
          <TR key={cred.credentialId}>
            <TD className="font-medium">{cred.smtpUser}</TD>
            <TD>
              <Badge variant={cred.isActive ? 'success' : 'danger'}>
                {cred.isActive ? 'Active' : 'Disabled'}
              </Badge>
            </TD>
            <TD className="text-text-muted">
              {cred._count.emails} / {cred.maxEmails}
            </TD>
            <TD className="text-text-muted">{cred.maxSizeMb} MB</TD>
            <TD className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(cred)} className="text-brand-primary">
                  <Edit2 size={14} />
                </Button>
                <form action={deleteCredential}>
                  <input type="hidden" name="id" value={cred.credentialId} />
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </Button>
                </form>
              </div>
            </TD>
          </TR>
        ))}
        {credentials.length === 0 && (
          <TR><TD colSpan={5} className="text-center py-8 text-text-muted italic">No inboxes configured.</TD></TR>
        )}
      </TBody>
    </Table>
  )

  const UserTable = (onEdit: (user: any) => void) => (
    <Table>
      <THead>
        <TR>
          <TH>Username</TH>
          <TH>Role</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {webUsers.map((user) => (
          <TR key={user.id}>
            <TD className="font-medium">{user.username}</TD>
            <TD>
              <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>{user.role}</Badge>
            </TD>
            <TD className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(user)} className="text-brand-primary">
                  <Edit2 size={14} />
                </Button>
                {user.id !== (session?.user as any).id && (
                  <form action={deleteWebUser}>
                    <input type="hidden" name="id" value={user.id} />
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </Button>
                  </form>
                )}
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )

  const AccessSection = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
          <Table>
              <THead>
                  <TR>
                      <TH>User</TH>
                      <TH>Granted Inboxes</TH>
                  </TR>
              </THead>
              <TBody>
                  {webUsers.map(user => (
                      <TR key={user.id}>
                          <TD className="font-medium">{user.username}</TD>
                          <TD>
                              <div className="flex flex-wrap gap-2">
                                  {user.inboxAccess.map(acc => (
                                      <form key={`${user.id}-${acc.credentialId}`} action={revokeAccess}>
                                          <input type="hidden" name="userId" value={user.id} />
                                          <input type="hidden" name="credentialId" value={acc.credentialId} />
                                          <Badge variant="info" className="gap-1 pr-1 group">
                                              {acc.credential.smtpUser}
                                              <button type="submit" className="hover:text-red-500 transition-colors cursor-pointer">
                                                  <Trash2 size={10} />
                                              </button>
                                          </Badge>
                                      </form>
                                  ))}
                                  {user.inboxAccess.length === 0 && <span className="text-xs text-text-muted italic">No access</span>}
                              </div>
                          </TD>
                      </TR>
                  ))}
              </TBody>
          </Table>
      </div>
      <div className="bg-bg-card border border-border-subtle p-6 rounded-lg h-fit space-y-4 shadow-sm">
          <h4 className="text-sm font-bold flex items-center gap-2 text-brand-primary">
              <Plus size={16} /> Grant New Access
          </h4>
          <form action={grantAccess} className="space-y-4">
              <Select 
                  name="userId" 
                  label="User"
                  options={webUsers.map(u => ({ label: u.username, value: u.id }))} 
              />
              <Select 
                  name="credentialId" 
                  label="Inbox"
                  options={credentials.map(c => ({ label: c.smtpUser, value: c.credentialId }))} 
              />
              <Button className="w-full">Grant Access</Button>
          </form>
      </div>
    </div>
  )

  return (
    <SettingsClient 
      inboxTable={InboxTable} 
      userTable={UserTable} 
      accessSection={AccessSection}
      onInboxSubmit={handleInboxSubmit}
      onUserSubmit={handleUserSubmit}
    />
  )
}
