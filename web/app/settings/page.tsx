import { auth } from "../../auth"
import prisma from "../../lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Shield } from "lucide-react"
import { revalidatePath } from "next/cache"
import { Button } from "../../components/atoms/Button"
import { ThemeToggle } from "../../components/molecules/ThemeToggle"
import { Card } from "../../components/atoms/Card"
import { Input } from "../../components/atoms/Input"

export default async function SettingsPage() {
  const session = await auth()
  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    redirect("/")
  }

  const credentials = await prisma.mailCredential.findMany()
  const webUsers = await prisma.webUser.findMany({
      select: { id: true, username: true, role: true }
  })

  async function addCredential(formData: FormData) {
    'use server'
    const user = formData.get("user") as string
    const pass = formData.get("pass") as string
    
    await prisma.mailCredential.create({
        data: {
            smtpUser: user,
            smtpPassword: pass
        }
    })
    
    revalidatePath("/settings")
  }

  return (
    <div className="min-h-screen bg-bg-main p-8 text-text-main">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="flex items-center gap-2 text-brand-primary hover:underline transition-colors">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <ThemeToggle />
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="grid gap-8">
          {/* SMTP Credentials */}
          <Card 
            title="SMTP Credentials (Inboxes)"
            icon={<Mail className="text-brand-primary" />}
          >
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle text-sm text-text-muted">
                      <th className="pb-2">Username</th>
                      <th className="pb-2">Password</th>
                      <th className="pb-2">Limits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {credentials.map((cred: any) => (
                      <tr key={cred.credentialId} className="text-sm">
                        <td className="py-3 text-text-main">{cred.smtpUser}</td>
                        <td className="py-3 text-text-muted italic">••••••••</td>
                        <td className="py-3 text-text-muted">{cred.maxEmails} emails / {cred.maxSizeMb}MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form action={addCredential} className="mt-6 flex items-end gap-2">
                <div className="flex-1">
                  <Input 
                    name="user" 
                    label="SMTP Username"
                    placeholder="e.g. support" 
                    required 
                  />
                </div>
                <div className="flex-1">
                  <Input 
                    name="pass" 
                    type="password"
                    label="SMTP Password"
                    placeholder="••••••••" 
                    required 
                  />
                </div>
                <Button className="h-10">
                  Add Inbox
                </Button>
              </form>
            </div>
          </Card>

          {/* Web Users */}
          <Card 
            title="Web Users"
            icon={<Shield className="text-green-500" />}
          >
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle text-sm text-text-muted">
                      <th className="pb-2">Username</th>
                      <th className="pb-2">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {webUsers.map((user: any) => (
                      <tr key={user.id} className="text-sm">
                        <td className="py-3 text-text-main">{user.username}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            user.role === 'ADMIN' 
                              ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' 
                              : 'bg-text-muted/10 text-text-muted border border-text-muted/20'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-text-muted italic">User creation via UI is coming soon.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Helper component to add icon support to Card title (not in atomic yet, just for this page)
function Card({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="bg-bg-card p-6 rounded-lg shadow-sm border border-border-subtle">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              {icon}
              {title}
            </h2>
            {children}
        </section>
    )
}
