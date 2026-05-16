import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import prisma from "./lib/db"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.webUser.findUnique({
          where: { username: credentials.username as string }
        })

        if (!user) return null

        const isPasswordValid = credentials.password === user.passwordHash || 
                                await bcrypt.compare(credentials.password as string, user.passwordHash)

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
