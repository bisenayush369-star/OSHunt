import NextAuth from "next-auth"
import type { Adapter } from "next-auth/adapters"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

const nextAuthSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
const missingConfig: string[] = []

const adapter = PrismaAdapter(prisma) as Partial<Adapter>

const safeAdapter = {
  ...adapter,
  async getUserByAccount(provider_providerAccountId: { provider?: string; providerAccountId?: string } | null) {
    if (!provider_providerAccountId?.provider || !provider_providerAccountId?.providerAccountId) {
      return null
    }
    return adapter.getUserByAccount?.(provider_providerAccountId as { provider: string; providerAccountId: string })
  },
  unlinkAccount(provider_providerAccountId: { provider?: string; providerAccountId?: string } | null) {
    if (!provider_providerAccountId?.provider || !provider_providerAccountId?.providerAccountId) {
      return null
    }
    return adapter.unlinkAccount?.(provider_providerAccountId as { provider: string; providerAccountId: string })
  },
  async getAccount(providerAccountId?: string | null, provider?: string | null) {
    if (!providerAccountId || !provider) {
      return null
    }
    return adapter.getAccount?.(providerAccountId, provider)
  },
} as Adapter

if (!nextAuthSecret) missingConfig.push("AUTH_SECRET or NEXTAUTH_SECRET")
if (!process.env.NEXTAUTH_URL) missingConfig.push("NEXTAUTH_URL")
if (!process.env.GITHUB_ID) missingConfig.push("GITHUB_ID")
if (!process.env.GITHUB_SECRET) missingConfig.push("GITHUB_SECRET")
if (!process.env.GOOGLE_CLIENT_ID) missingConfig.push("GOOGLE_CLIENT_ID")
if (!process.env.GOOGLE_CLIENT_SECRET) missingConfig.push("GOOGLE_CLIENT_SECRET")

if (missingConfig.length > 0) {
  throw new Error(
    `NextAuth configuration is incomplete. Missing environment variables: ${missingConfig.join(", ")}`,
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: safeAdapter,
  trustHost: true,
  secret: nextAuthSecret,
  debug: process.env.NODE_ENV !== "production",
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
    signIn: "/login",
    // no onboarding page: send new users to the hunt entry instead
    newUser: "/hunt",
  },
  session: { strategy: "database" },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
        if (emailVerified === false) {
          return false;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === baseUrl) {
          return parsedUrl.toString();
        }
      } catch {
        // ignore malformed redirect targets and fall back to baseUrl
      }

      return baseUrl;
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
})