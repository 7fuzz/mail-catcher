import { auth } from "@/auth"
import prisma from "@/lib/db"
import { redirect } from "next/navigation"
import { Mail, Shield, UserPlus, Trash2, Key, Users } from "lucide-react"
import { revalidatePath } from "next/cache"
import { Button } from "@/components/atoms/Button"
import { Card } from "@/components/atoms/Card"
import { Input } from "@/components/atoms/Input"
import { Badge } from "@/components/atoms/Badge"
import { Select } from "@/components/atoms/Select"
import { ManagementLayout } from "@/components/templates/ManagementLayout"
import bcrypt from "bcryptjs"

export default async function SettingsPage() {
  const session = await auth()
  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    redirect("/")
  }

  const credentials = await prisma.mailCredential.findMany({
    include: {
      _count: { select: { emails: true } }
    }
  })
  const webUsers = await prisma.webUser.findMany({
    include: {
      inboxAccess: {
        include: { credential: true }
      }
    }
  })

  // --- Server Actions ---

  async function addCredential(formData: FormData) {
    'use server'
    const user = formData.get("user") as string
    const pass = formData.get("pass") as string
    const maxEmails = parseInt(formData.get("maxEmails") as string) || 100
    const maxSizeMb = parseInt(formData.get("maxSizeMb") as string) || 50
    
    await prisma.mailCredential.create({
        data: {
            smtpUser: user,
            smtpPassword: pass,
            maxEmails,
            maxSizeMb
        }
    })
    revalidatePath("/settings")
  }

  async function deleteCredential(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    await prisma.mailCredential.delete({ where: { credentialId: id } })
    revalidatePath("/settings")
  }

  async function addWebUser(formData: FormData) {
    'use server'
    const username = formData.get("username") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as string
    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.webUser.create({
      data: {
        username,
        passwordHash: hashedPassword,
        role
      }
    })
    revalidatePath("/settings")
  }

  async function deleteWebUser(formData: FormData) {
    'use server'
    const id = formData.get("id") as string
    // Prevent deleting self
    if (id === (session?.user as any).id) return;
    
    await prisma.webUser.delete({ where: { id } })
    revalidatePath("/settings")
  }

  async function grantAccess(formData: FormData) {
    'use server'
    const userId = formData.get("userId") as string
    const credentialId = formData.get("credentialId") as string

    await prisma.userInboxAccess.upsert({
      where: {
        userId_credentialId: { userId, credentialId }
      },
      update: {},
      create: { userId, credentialId }
    })
    revalidatePath("/settings")
  }

  async function revokeAccess(formData: FormData) {
    'use server'
    const userId = formData.get("userId") as string
    const credentialId = formData.get("credentialId") as string

    await prisma.userInboxAccess.delete({
      where: {
        userId_credentialId: { userId, credentialId }
      }
    })
    revalidatePath("/settings")
  }

  return (
    <ManagementLayout 
      title="Management Dashboard" 
      description="Manage SMTP credentials, web users, and their access levels."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 1: SMTP Credentials */}
        <div className="space-y-8">
          <Card title="SMTP Inboxes" icon={<Mail className="text-brand-primary" />}>
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
                      <th className="pb-3">User</th>
                      <th className="pb-3">Usage</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {credentials.map((cred) => (
                      <tr key={cred.credentialId} className="group">
                        <td className="py-4">
                          <div className="font-medium text-text-main">{cred.smtpUser}</div>
                          <div className="text-xs text-text-muted">••••••••</div>
                        </td>
                        <td className="py-4">
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between max-w-[120px]">
                              <span>Emails:</span>
                              <span className="font-mono">{cred._count.emails}/{cred.maxEmails}</span>
                            </div>
                            <div className="flex justify-between max-w-[120px]">
                              <span>Size:</span>
                              <span className="font-mono">{cred.maxSizeMb}MB</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <form action={deleteCredential}>
                            <input type="hidden" name="id" value={cred.credentialId} />
                            <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                              <Trash2 size={14} />
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-border-subtle">
                <h4 className="text-sm font-semibold mb-4">Add New Inbox</h4>
                <form action={addCredential} className="grid grid-cols-2 gap-3">
                  <Input name="user" placeholder="SMTP User" required />
                  <Input name="pass" type="password" placeholder="SMTP Password" required />
                  <Input name="maxEmails" type="number" placeholder="Max Count (100)" />
                  <Input name="maxSizeMb" type="number" placeholder="Max Size MB (50)" />
                  <Button className="col-span-2 mt-2">Add Inbox</Button>
                </form>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 2: Web Users & Access */}
        <div className="space-y-8">
          <Card title="Web Users" icon={<Shield className="text-purple-500" />}>
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
                      <th className="pb-3">User</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {webUsers.map((user) => (
                      <tr key={user.id} className="group">
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-main">{user.username}</span>
                            <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>
                              {user.role}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.inboxAccess.map(acc => (
                              <form key={acc.credentialId} action={revokeAccess} className="inline-block">
                                <input type="hidden" name="userId" value={user.id} />
                                <input type="hidden" name="credentialId" value={acc.credentialId} />
                                <button className="inline-flex items-center gap-1 bg-brand-primary/5 border border-brand-primary/20 text-[10px] px-1.5 py-0.5 rounded text-brand-primary hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-colors">
                                  {acc.credential.smtpUser} <Trash2 size={8} />
                                </button>
                              </form>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 text-right">
                           {user.id !== (session?.user as any).id && (
                             <form action={deleteWebUser}>
                               <input type="hidden" name="id" value={user.id} />
                               <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                                 <Trash2 size={14} />
                               </Button>
                             </form>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-border-subtle space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <UserPlus size={14} /> Create User
                  </h4>
                  <form action={addWebUser} className="grid grid-cols-2 gap-3">
                    <Input name="username" placeholder="Username" required />
                    <Input name="password" type="password" placeholder="Password" required />
                    <Select 
                      name="role" 
                      options={[{label: 'Viewer', value: 'VIEWER'}, {label: 'Admin', value: 'ADMIN'}]} 
                    />
                    <Button className="mt-auto">Create</Button>
                  </form>
                </div>

                <div className="pt-4 border-t border-border-subtle/50">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Key size={14} /> Grant Inbox Access
                  </h4>
                  <form action={grantAccess} className="grid grid-cols-2 gap-3">
                    <Select 
                      name="userId" 
                      label="Select User"
                      options={webUsers.map(u => ({ label: u.username, value: u.id }))} 
                    />
                    <Select 
                      name="credentialId" 
                      label="Select Inbox"
                      options={credentials.map(c => ({ label: c.smtpUser, value: c.credentialId }))} 
                    />
                    <Button className="col-span-2">Grant Access</Button>
                  </form>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </ManagementLayout>
  )
}
