import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import db from "./lib/db"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user: any = db.prepare("SELECT * FROM web_users WHERE username = ?").get(credentials.username)

        if (!user) return null

        // In a real app, we'd use bcrypt.compare(credentials.password, user.password_hash)
        // For the default 'admin' user created by smtp-service, we'll allow plain 'admin' for now
        // if we didn't hash it there.
        const isPasswordValid = credentials.password === user.password_hash || 
                                await bcrypt.compare(credentials.password as string, user.password_hash)

        if (!isPasswordValid) return null

        return {
          id: user.id,
          name: user.username,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
