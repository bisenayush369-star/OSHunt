import { auth } from "@/components/lib/auth";
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
       
      console.debug("HuntLayout: redirecting unauthenticated; session=", {
        user: session?.user ? { id: session.user.id ?? null, email: session.user.email ?? null, name: session.user.name ?? null } : null,
      });
    } catch (err) {
      // ignore logging failures
    }

    redirect(`/login?callbackUrl=${encodeURIComponent("/hunt")}`);
  }

  // No onboarding gate is required anymore. Authenticated users can proceed
  // directly to the app experience.
  return <>{children}</>;
}