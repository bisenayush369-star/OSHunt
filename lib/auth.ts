import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { getConnectionStatus, upsertGitHubConnection } from "@/lib/github-connection"

const authSecretFromEnv = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "development-secret-change-me"
const nextAuthSecret = authSecretFromEnv
const githubClientId = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const missingConfig: string[] = []

if (process.env.AUTH_SECRET && process.env.NEXTAUTH_SECRET && process.env.AUTH_SECRET !== process.env.NEXTAUTH_SECRET) {
  console.warn("[auth] AUTH_SECRET and NEXTAUTH_SECRET are set to different values. Using the AUTH_SECRET value to keep JWTs consistent.")
}

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  missingConfig.push("AUTH_SECRET or NEXTAUTH_SECRET")
}
if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
  missingConfig.push("AUTH_URL or NEXTAUTH_URL")
}
if (!githubClientId) missingConfig.push("GITHUB_ID or GITHUB_CLIENT_ID")
if (!githubClientSecret) missingConfig.push("GITHUB_SECRET or GITHUB_CLIENT_SECRET")

if (missingConfig.length > 0) {
  console.warn("[auth] Missing optional auth environment variables:", missingConfig.join(", "))
}

const providers = [
  ...(githubClientId && githubClientSecret
    ? [
        GitHub({
          clientId: githubClientId,
          clientSecret: githubClientSecret,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...(googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          allowDangerousEmailAccountLinking: true,
          authorization: {
            params: {
              prompt: "select_account consent",
              access_type: "offline",
            },
          },
        }),
      ]
    : []),
]

// Debug: log resolved auth-related environment values to help diagnose configuration issues in dev
if (process.env.NODE_ENV !== "production") {
  try {
    console.debug("[auth:debug] nextAuthSecret set:", Boolean(nextAuthSecret));
    console.debug("[auth:debug] NEXTAUTH_URL:", process.env.NEXTAUTH_URL || process.env.AUTH_URL);
    console.debug("[auth:debug] Providers configured:", providers.map(p => (p as any)?.id || (p as any)?.name || "unknown"));
    console.debug("[auth:debug] githubClientId present:", Boolean(githubClientId));
    console.debug("[auth:debug] githubClientSecret present:", Boolean(githubClientSecret));
    console.debug("[auth:debug] googleClientId present:", Boolean(googleClientId));
    console.debug("[auth:debug] googleClientSecret present:", Boolean(googleClientSecret));
  } catch (e) {
    console.error("[auth:debug] failed to log auth debug info", e);
  }
}

async function ensureDbUserForOAuth(input: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  provider?: string;
  providerAccountId?: string | number | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
}) {
  const provider = input.provider;
  const providerAccountId = input.providerAccountId == null ? null : String(input.providerAccountId);
  const normalizedEmail = input.email?.trim() || null;

  if (provider && providerAccountId) {
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount?.user) {
      return existingAccount.user.id;
    }
  }

  if (normalizedEmail) {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (provider && providerAccountId) {
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId,
            },
          },
          update: {
            userId: existingUser.id,
            access_token: input.accessToken ?? null,
            refresh_token: input.refreshToken ?? null,
            expires_at: input.expiresAt ?? null,
          },
          create: {
            userId: existingUser.id,
            type: "oauth",
            provider,
            providerAccountId,
            access_token: input.accessToken ?? null,
            refresh_token: input.refreshToken ?? null,
            expires_at: input.expiresAt ?? null,
          },
        });
      }
      return existingUser.id;
    }
  }

  const createdUser = await prisma.user.create({
    data: {
      email: normalizedEmail ?? undefined,
      name: input.name ?? normalizedEmail?.split("@")[0] ?? (provider ? `${provider}-user` : "New user"),
      image: input.image ?? null,
    },
  });

  if (provider && providerAccountId) {
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      update: {
        userId: createdUser.id,
        access_token: input.accessToken ?? null,
        refresh_token: input.refreshToken ?? null,
        expires_at: input.expiresAt ?? null,
      },
      create: {
        userId: createdUser.id,
        type: "oauth",
        provider,
        providerAccountId,
        access_token: input.accessToken ?? null,
        refresh_token: input.refreshToken ?? null,
        expires_at: input.expiresAt ?? null,
      },
    });
  }

  return createdUser.id;
}

function getSafeAppPath(rawValue: string | null, fallback = "/") {
  if (!rawValue) return fallback

  let decoded = rawValue
  try {
    decoded = decodeURIComponent(rawValue)
  } catch {
    decoded = rawValue
  }

  if (!decoded.startsWith("/")) return fallback

  try {
    const parsed = new URL(decoded, "http://localhost")
    const nestedCallback = parsed.searchParams.get("callbackUrl")

    if (["/login", "/signin", "/onboarding", "/api/auth/signin"].includes(parsed.pathname)) {
      if (nestedCallback) {
        return getSafeAppPath(nestedCallback, fallback)
      }
      return fallback
    }

    if (nestedCallback && parsed.pathname === "/") {
      return getSafeAppPath(nestedCallback, fallback)
    }
  } catch {
    // ignore malformed URLs and fall through to the direct path checks below
  }

  if (["/login", "/signin", "/onboarding", "/api/auth/signin"].includes(decoded)) return fallback
  if (decoded.startsWith("/api/auth/signin?")) {
    try {
      const parsed = new URL(decoded, "http://localhost")
      const nestedCallback = parsed.searchParams.get("callbackUrl")
      if (nestedCallback) return getSafeAppPath(nestedCallback, fallback)
    } catch {
      // ignore malformed URLs
    }
    return fallback
  }

  if (decoded.startsWith("/login?") || decoded.startsWith("/signin?") || decoded.startsWith("/onboarding?")) {
    try {
      const parsed = new URL(decoded, "http://localhost")
      const nestedCallback = parsed.searchParams.get("callbackUrl")
      if (nestedCallback) return getSafeAppPath(nestedCallback, fallback)
    } catch {
      // ignore malformed URLs
    }
    return fallback
  }

  return decoded
}

const nextAuth = NextAuth({
  trustHost: true,
  secret: nextAuthSecret,
  debug: process.env.NODE_ENV !== "production",
  providers,
  pages: {
    newUser: "/hunt",
  },
  session: { strategy: "jwt" },
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
    async jwt({ token, user, account, profile }) {
      if (user?.email || (account?.provider && account?.providerAccountId)) {
        const resolvedUserId = await ensureDbUserForOAuth({
          email: user?.email,
          name: user?.name,
          image: user?.image,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId ?? user?.id,
          accessToken: account?.access_token ?? null,
          refreshToken: account?.refresh_token ?? null,
          expiresAt: account?.expires_at ?? null,
        });

        if (resolvedUserId) token.sub = resolvedUserId;
      } else if (user?.id) {
        token.sub = String(user.id)
      }

      if (user?.email) token.email = user.email
      if (account?.provider) token.provider = account.provider
      if (profile && typeof profile === "object" && "login" in profile) {
        token.githubUsername = String((profile as { login?: string }).login ?? "")
      }
      return token
    },
    async signIn() {
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        const safePath = getSafeAppPath(url)
        return `${baseUrl}${safePath}`
      }

      try {
        const parsedUrl = new URL(url)
        if (parsedUrl.origin !== baseUrl) {
          return baseUrl
        }

        if (parsedUrl.pathname === "/login") {
          const callbackUrl = parsedUrl.searchParams.get("callbackUrl")
          const safePath = getSafeAppPath(callbackUrl)
          return `${baseUrl}${safePath}`
        }

        return parsedUrl.toString()
      } catch {
        return baseUrl
      }
    },
    async session({ session, token }) {
      if (session.user) {
        const typedUser = session.user as typeof session.user & {
          id?: string;
          provider?: string;
          hasGithub?: boolean;
          github?: { username?: string; avatarUrl?: string | null; scopes?: string[] } | null;
        };

        let userId = typeof token.sub === "string" ? token.sub : "";

        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
          });

          if (!user) {
            userId = "";
          }
        }

        typedUser.id = userId;
        typedUser.provider = typeof token.provider === "string" ? token.provider : undefined;

        try {
          const status = await getConnectionStatus(userId);
          typedUser.hasGithub = Boolean(userId && status.connected);
          typedUser.github = userId && status.connected
            ? { username: status.username, avatarUrl: status.avatarUrl, scopes: status.scopes }
            : null;
        } catch {
          typedUser.hasGithub = false;
          typedUser.github = null;
        }
      }
      return session;
    },
  },
  events: {
    // After a successful sign in via any provider, if it's GitHub and
    // we received an access token from NextAuth, create/refresh the
    // `gitHubConnection` row so users don't need a separate "Connect"
    // flow just to provide a token for rate-limited GitHub fetches.
    async signIn({ user, account, profile }) {
      try {
        const githubProfile = profile as { id?: string | number; login?: string; avatar_url?: string | null; email?: string | null } | undefined;
        const googleProfile = profile as { picture?: string | null; email?: string | null } | undefined;
        const githubAccount = account as {
          provider?: string;
          providerAccountId?: string | number | null;
          access_token?: string;
          refresh_token?: string | null;
          scope?: string | null;
          expires_at?: number | null;
        } | undefined;

        const providerImage =
          account?.provider === "github" ? githubProfile?.avatar_url :
          account?.provider === "google" ? googleProfile?.picture : null;

        const resolvedUserId = await ensureDbUserForOAuth({
          email: user?.email ?? githubProfile?.email ?? googleProfile?.email,
          name: user?.name,
          image: providerImage ?? user?.image,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId ?? profile?.id ?? user?.id,
          accessToken: githubAccount?.access_token ?? account?.access_token ?? null,
          refreshToken: githubAccount?.refresh_token ?? account?.refresh_token ?? null,
          expiresAt: githubAccount?.expires_at ?? account?.expires_at ?? null,
        });

        if (resolvedUserId && providerImage) {
          await prisma.user.update({
            where: { id: resolvedUserId },
            data: { image: providerImage },
          });
        }

        if (account?.provider === "github" && githubAccount?.access_token && resolvedUserId) {
          await upsertGitHubConnection({
            userId: resolvedUserId,
            githubUserId: String(githubProfile?.id ?? ""),
            username: githubProfile?.login ?? "",
            avatarUrl: githubProfile?.avatar_url ?? null,
            accessToken: githubAccount.access_token,
            refreshToken: githubAccount.refresh_token ?? null,
            scopes: (githubAccount.scope || "").toString().split(",").filter(Boolean),
            tokenExpiresAt: githubAccount.expires_at ? new Date(Number(githubAccount.expires_at) * 1000) : null,
          });
        }
      } catch (err) {
        // Don't block sign-in for upsert/connect failures; log for visibility
        console.error("NextAuth signIn: failed to upsert GitHub connection:", err);
      }
    },
  },
})

export const { handlers, signIn, signOut } = nextAuth

// Export the NextAuth handler as the default export so the App Router
// can import and re-export it as GET/POST in the route module.
export default nextAuth;

export async function auth() {
  try {
    return await nextAuth.auth();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldIgnore = /JWTSessionError|jwt.*error|invalid.*token|session.*token/i.test(message)

    if (!shouldIgnore) {
      console.error("[auth] Session lookup failed; treating request as unauthenticated.", error);
    }

    return null;
  }
}