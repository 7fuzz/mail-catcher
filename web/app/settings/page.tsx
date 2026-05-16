import { auth } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import { Trash2, UserPlus, Key, Mail, Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { Button } from "@/components/atoms/Button"
import { Input } from "@/components/atoms/Input"
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

  // --- Actions ---
  async function addCredential(formData: FormData) {
    'use server'
    await prisma.mailCredential.create({
        data: {
            smtpUser: formData.get("user") as string,
            smtpPassword: formData.get("pass") as string,
            maxEmails: parseInt(formData.get("maxEmails") as string) || 100,
            maxSizeMb: parseInt(formData.get("maxSizeMb") as string) || 50
        }
    })
    revalidatePath("/settings")
  }

  async function updateCredential(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    await prisma.mailCredential.update({
        where: { credentialId: id },
        data: {
            maxEmails: parseInt(formData.get("maxEmails") as string),
            maxSizeMb: parseInt(formData.get("maxSizeMb") as string)
        }
    })
    revalidatePath("/settings")
  }

  async function deleteCredential(formData: FormData) {
    'use server'
    await prisma.mailCredential.delete({ where: { credentialId: formData.get("id") as string } })
    revalidatePath("/settings")
  }

  async function addWebUser(formData: FormData) {
    'use server'
    const password = formData.get("password") as string
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.webUser.create({
      data: {
        username: formData.get("username") as string,
        passwordHash: hashedPassword,
        role: formData.get("role") as string
      }
    })
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

  // --- Section Components ---

  const InboxSection = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Manage Inboxes</h3>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>SMTP User</TH>
            <TH>Emails (Current/Max)</TH>
            <TH>Storage Limit</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {credentials.map((cred) => (
            <TR key={cred.credentialId}>
              <TD className="font-medium">{cred.smtpUser}</TD>
              <TD>
                <form action={updateCredential} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={cred.credentialId} />
                  <span className="text-xs text-text-muted">{cred._count.emails} /</span>
                  <input 
                    name="maxEmails" 
                    type="number" 
                    defaultValue={cred.maxEmails} 
                    className="w-20 bg-bg-main border border-border-subtle rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Save limits">
                    <Plus size={12} />
                  </Button>
                </form>
              </TD>
              <TD>
                <div className="flex items-center gap-2">
                    <input 
                        name="maxSizeMb" 
                        form={`update-${cred.credentialId}`}
                        type="number" 
                        defaultValue={cred.maxSizeMb} 
                        className="w-16 bg-bg-main border border-border-subtle rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                    />
                    <span className="text-xs text-text-muted">MB</span>
                </div>
                {/* Hidden form for the combined storage/email update */}
                <form id={`update-${cred.credentialId}`} action={updateCredential}>
                    <input type="hidden" name="id" value={cred.credentialId} />
                    <input type="hidden" name="maxEmails" defaultValue={cred.maxEmails} />
                </form>
              </TD>
              <TD className="text-right">
                <form action={deleteCredential}>
                  <input type="hidden" name="id" value={cred.credentialId} />
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </Button>
                </form>
              </TD>
            </TR>
          ))}
          <TR className="bg-bg-sidebar/30">
            <form action={addCredential}>
              <TD><Input name="user" placeholder="New SMTP User" className="h-8 text-xs" required /></TD>
              <TD><Input name="pass" type="password" placeholder="Password" className="h-8 text-xs" required /></TD>
              <TD>
                <div className="flex gap-2">
                  <Input name="maxEmails" type="number" placeholder="Count" className="h-8 text-xs" />
                  <Input name="maxSizeMb" type="number" placeholder="MB" className="h-8 text-xs" />
                </div>
              </TD>
              <TD className="text-right">
                <Button size="sm" className="h-8">Add</Button>
              </TD>
            </form>
          </TR>
        </TBody>
      </Table>
    </div>
  )

  const UserSection = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Web Access Users</h3>
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
                {user.id !== (session?.user as any).id && (
                  <form action={deleteWebUser}>
                    <input type="hidden" name="id" value={user.id} />
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </Button>
                  </form>
                )}
              </TD>
            </TR>
          ))}
          <TR className="bg-bg-sidebar/30">
            <form action={addWebUser}>
              <TD><Input name="username" placeholder="New Username" className="h-8 text-xs" required /></TD>
              <TD>
                <div className="flex gap-2">
                    <Input name="password" type="password" placeholder="Password" className="h-8 text-xs" required />
                    <Select name="role" className="h-8 py-0 text-xs" options={[{label: 'Viewer', value: 'VIEWER'}, {label: 'Admin', value: 'ADMIN'}]} />
                </div>
              </TD>
              <TD className="text-right">
                <Button size="sm" className="h-8">Create</Button>
              </TD>
            </form>
          </TR>
        </TBody>
      </Table>
    </div>
  )

  const AccessSection = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Inbox Permissions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                                        <form key={acc.credentialId} action={revokeAccess}>
                                            <input type="hidden" name="userId" value={user.id} />
                                            <input type="hidden" name="credentialId" value={acc.credentialId} />
                                            <Badge variant="info" className="gap-1 pr-1 group">
                                                {acc.credential.smtpUser}
                                                <button type="submit" className="hover:text-red-500 transition-colors">
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
        <div className="bg-bg-card border border-border-subtle p-6 rounded-lg h-fit space-y-4">
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
    </div>
  )

  return (
    <SettingsClient 
      inboxSection={InboxSection} 
      userSection={UserSection} 
      accessSection={AccessSection} 
    />
  )
}
