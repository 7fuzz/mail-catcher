import { auth } from "../../auth"
import prisma from "../../lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Shield } from "lucide-react"
import { revalidatePath } from "next/cache"

export default async function SettingsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== "ADMIN") {
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-blue-600 mb-6 hover:underline">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="grid gap-8">
          {/* SMTP Credentials */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="text-blue-500" />
              SMTP Credentials (Inboxes)
            </h2>
            <div className="space-y-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-gray-500">
                    <th className="pb-2">Username</th>
                    <th className="pb-2">Password</th>
                    <th className="pb-2">Limits</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred: any) => (
                    <tr key={cred.credentialId} className="border-b last:border-0 text-sm">
                      <td className="py-2">{cred.smtpUser}</td>
                      <td className="py-2">••••••••</td>
                      <td className="py-2">{cred.maxEmails} emails / {cred.maxSizeMb}MB</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <form action={addCredential} className="mt-4 flex gap-2">
                <input name="user" placeholder="SMTP Username" className="flex-1 p-2 border rounded text-sm" required />
                <input name="pass" placeholder="SMTP Password" className="flex-1 p-2 border rounded text-sm" required />
                <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                  Add Inbox
                </button>
              </form>
            </div>
          </section>

          {/* Web Users */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="text-green-500" />
              Web Users
            </h2>
            <div className="space-y-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-gray-500">
                    <th className="pb-2">Username</th>
                    <th className="pb-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {webUsers.map((user: any) => (
                    <tr key={user.id} className="border-b last:border-0 text-sm">
                      <td className="py-2">{user.username}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 italic">User creation via UI is coming soon.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
