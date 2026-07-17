import GitHubClusterSection from "@/components/GitHubClusterSection"
import { auth } from "@/lib/auth" 
import { prisma } from "@/lib/prisma"

export default async function ClusterPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return <GitHubClusterSection connected={false} plan="free" />
  }

  // 1. Fetch user AND their linked OAuth accounts from Prisma
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { accounts: true },
  })

  // 2. Check if they have linked a GitHub account
  const githubAccount = user?.accounts.find(
    (account) => account.provider === "github"
  )
  const isConnected = !!githubAccount

  return (
    <GitHubClusterSection
      connected={isConnected}
      plan={user?.plan ?? "pro"}
      username={githubAccount?.providerAccountId ?? user?.name ?? undefined}
      avatarUrl={user?.image ?? undefined}
      stats={{ 
        reposScanned: user?.reposScanned ?? 0, 
        matches: user?.matchCount ?? 0 
      }}
    />
  )
}