import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HuntLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // 1. If NOT logged in, instantly redirect them to your /signin page!
  if (!session?.user?.id) {
    redirect("/signin"); // Note: If your route is /login or /api/auth/signin, put that here instead!
  }

  // 2. If they ARE logged in, check their database status for onboarding
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true },
  });

  // 3. If they haven't filled out the form yet, send them to onboarding
  if (!dbUser?.onboarded) {
    redirect("/onboarding");
  }

  // 4. Fully authenticated and onboarded — render the hunt page!
  return <>{children}</>;
}