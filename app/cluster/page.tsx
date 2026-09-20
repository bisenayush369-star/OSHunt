import { redirect } from "next/navigation"
import GitHubClusterSection from "@/components/github-cluster"
import Navbar from "@/components/ui/Navbar"
import { auth } from "@/lib/auth" 
import { prisma } from "@/lib/prisma"

export default async function ClusterPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/cluster")}`)
  }

  // 1. Fetch user AND their linked OAuth accounts from Prisma
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      image: true,
      accounts: true,
    },
  })

  // 2. Check if they have linked a GitHub account
  const githubAccount = user?.accounts.find(
    (account) => account.provider === "github"
  )
  const isConnected = !!githubAccount

  return (
    <>
      <Navbar />
      <GitHubClusterSection
        connected={isConnected}
        plan="pro"
        username={githubAccount?.providerAccountId ?? user?.name ?? undefined}
        avatarUrl={user?.image ?? undefined}
      />
    </>
  )
}
