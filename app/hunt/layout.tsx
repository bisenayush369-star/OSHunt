import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function HuntLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // 1. If they are NOT logged in, kick them to the home page
  if (!session?.user?.id) {
    redirect("/")
  }

  // 2. If they ARE logged in, check their database status
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true }
  })

  // 3. If they haven't filled out the form, trap them in onboarding
  if (!dbUser?.onboarded) {
    redirect("/onboarding")
  }

  // 4. If everything is perfect, let them into the hunt page!
  return <>{children}</>
}