import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { ADMIN_PATHS } from "@/components/lib/admin/contract";
import { hasKnock, isAdmin } from "@/components/lib/admin/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return (await hasKnock()) ? { title: "Sign in | OSHunt admin", robots: { index: false, follow: false } } : {};
}

/**
 * Only reachable right after the footer heart was clicked (the 10-minute knock cookie). Everyone else gets the
 * normal 404, so the page does not exist for them. Already signed in? Straight to the dashboard.
 */
export default async function AdminLoginPage() {
  const localDevBypass = process.env.NODE_ENV !== "production";

  if (await isAdmin()) redirect(ADMIN_PATHS.home);
  if (!localDevBypass && !(await hasKnock())) notFound();
  return <LoginForm />;
}
