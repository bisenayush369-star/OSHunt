import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HuntLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Redirect unauthenticated users back to login with a safe callback so the
  // auth flow does not bounce between /hunt and /login.
  if (!session?.user?.id) {
    // Debug: log session shape when redirecting so we can diagnose loops
    // without exposing sensitive tokens in production logs.
    try {
      // eslint-disable-next-line no-console
      console.debug("HuntLayout: redirecting unauthenticated; session=", {
        user: session?.user ? { id: session.user.id ?? null, email: session.user.email ?? null, name: session.user.name ?? null } : null,
      });
    } catch (err) {
      // ignore logging failures
    }

    redirect(`/login?callbackUrl=${encodeURIComponent("/hunt")}`);
  }

  // 2. If they ARE logged in, check their database status for onboarding
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true },
  });

  // 3. If they haven't filled out the form yet, allow access — onboarding
  //    has been removed, so treat every authenticated user as ready.

  // 4. Fully authenticated and onboarded — render the hunt page!
  return <>{children}</>;
}