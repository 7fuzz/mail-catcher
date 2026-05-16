import { auth } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import { Trash2, UserPlus, Key, Mail, Plus, Save, Eye, EyeOff } from "lucide-react"
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

  // --- Server Actions ---

  // INBOX ACTIONS
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
    const data: any = {
        smtpUser: formData.get("user") as string,
        maxEmails: parseInt(formData.get("maxEmails") as string),
        maxSizeMb: parseInt(formData.get("maxSizeMb") as string)
    }
    const newPass = formData.get("pass") as string
    if (newPass && newPass !== "********") {
        data.smtpPassword = newPass
    }

    await prisma.mailCredential.update({
        where: { credentialId: id },
        data
    })
    revalidatePath("/settings")
  }

  async function deleteCredential(formData: FormData) {
    'use server'
    await prisma.mailCredential.delete({ where: { credentialId: formData.get("id") as string } })
    revalidatePath("/settings")
  }

  // USER ACTIONS
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

  async function updateWebUser(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    const username = formData.get("username") as string
    const role = formData.get("role") as string
    const newPass = formData.get("password") as string

    const data: any = { username, role }
    if (newPass) {
        data.passwordHash = await bcrypt.hash(newPass, 10)
    }

    await prisma.webUser.update({
        where: { id },
        data
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

  // ACCESS ACTIONS
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
      <h3 className="text-lg font-semibold">SMTP Inboxes</h3>
      
      {/* Hidden Forms for Row Updates */}
      {credentials.map(cred => (
        <form key={`form-update-${cred.credentialId}`} id={`form-update-${cred.credentialId}`} action={updateCredential}>
            <input type="hidden" name="id" value={cred.credentialId} />
        </form>
      ))}
      <form id="form-add-inbox" action={addCredential}></form>

      <Table>
        <THead>
          <TR>
            <TH>User</TH>
            <TH>Password</TH>
            <TH>Max Count</TH>
            <TH>Max Size (MB)</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {credentials.map((cred) => (
            <TR key={cred.credentialId}>
              <TD>
                <input 
                    name="user" 
                    form={`form-update-${cred.credentialId}`}
                    defaultValue={cred.smtpUser} 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium"
                />
              </TD>
              <TD>
                <input 
                    name="pass" 
                    type="password"
                    form={`form-update-${cred.credentialId}`}
                    defaultValue="********" 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-text-muted"
                />
              </TD>
              <TD>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted whitespace-nowrap">{cred._count.emails} /</span>
                    <input 
                        name="maxEmails" 
                        type="number" 
                        form={`form-update-${cred.credentialId}`}
                        defaultValue={cred.maxEmails} 
                        className="w-16 bg-bg-main border border-border-subtle rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                    />
                </div>
              </TD>
              <TD>
                <input 
                    name="maxSizeMb" 
                    type="number" 
                    form={`form-update-${cred.credentialId}`}
                    defaultValue={cred.maxSizeMb} 
                    className="w-16 bg-bg-main border border-border-subtle rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                />
              </TD>
              <TD className="text-right">
                <div className="flex justify-end gap-1">
                    <Button form={`form-update-${cred.credentialId}`} variant="ghost" size="sm" className="text-brand-primary">
                        <Save size={14} />
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
          <TR className="bg-bg-sidebar/30">
              <TD><Input name="user" form="form-add-inbox" placeholder="User" className="h-8 text-xs" required /></TD>
              <TD><Input name="pass" form="form-add-inbox" type="password" placeholder="Pass" className="h-8 text-xs" required /></TD>
              <TD><Input name="maxEmails" form="form-add-inbox" type="number" placeholder="100" className="h-8 text-xs" /></TD>
              <TD><Input name="maxSizeMb" form="form-add-inbox" type="number" placeholder="50" className="h-8 text-xs" /></TD>
              <TD className="text-right">
                <Button form="form-add-inbox" size="sm" className="h-8">Add</Button>
              </TD>
          </TR>
        </TBody>
      </Table>
    </div>
  )

  const UserSection = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Web Users</h3>
      
      {/* Hidden Forms */}
      {webUsers.map(user => (
        <form key={`form-user-${user.id}`} id={`form-user-${user.id}`} action={updateWebUser}>
            <input type="hidden" name="id" value={user.id} />
        </form>
      ))}
      <form id="form-add-user" action={addWebUser}></form>

      <Table>
        <THead>
          <TR>
            <TH>Username</TH>
            <TH>Role</TH>
            <TH>New Password (Optional)</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {webUsers.map((user) => (
            <TR key={user.id}>
              <TD>
                <input 
                    name="username" 
                    form={`form-user-${user.id}`}
                    defaultValue={user.username} 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium"
                />
              </TD>
              <TD>
                <Select 
                    name="role" 
                    form={`form-user-${user.id}`}
                    defaultValue={user.role}
                    className="h-8 py-0 text-xs w-28" 
                    options={[{label: 'Viewer', value: 'VIEWER'}, {label: 'Admin', value: 'ADMIN'}]} 
                />
              </TD>
              <TD>
                <input 
                    name="password" 
                    type="password"
                    form={`form-user-${user.id}`}
                    placeholder="Update password..."
                    className="w-full bg-transparent border-none focus:ring-0 text-xs text-text-muted italic"
                />
              </TD>
              <TD className="text-right">
                <div className="flex justify-end gap-1">
                    <Button form={`form-user-${user.id}`} variant="ghost" size="sm" className="text-brand-primary">
                        <Save size={14} />
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
          <TR className="bg-bg-sidebar/30">
              <TD><Input name="username" form="form-add-user" placeholder="Username" className="h-8 text-xs" required /></TD>
              <TD>
                 <Select name="role" form="form-add-user" className="h-8 py-0 text-xs w-28" options={[{label: 'Viewer', value: 'VIEWER'}, {label: 'Admin', value: 'ADMIN'}]} />
              </TD>
              <TD><Input name="password" form="form-add-user" type="password" placeholder="Password" className="h-8 text-xs" required /></TD>
              <TD className="text-right">
                <Button form="form-add-user" size="sm" className="h-8">Create</Button>
              </TD>
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
