import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma), 
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, 
    }),
  ],
  pages: {
    signIn: '/signin', 
    newUser: '/onboarding' 
  },
  // 🔥 REQUIRED: Tell NextAuth to use database sessions, not Edge JWTs
  session: { strategy: "database" }, 
  callbacks: {
    // 🔥 REQUIRED: Ensure the exact Database ID is attached to the session
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id; 
      }
      return session;
    },
  },
})