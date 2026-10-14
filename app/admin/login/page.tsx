import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { ADMIN_PATHS } from "@/components/lib/admin/contract";
import { isAdmin } from "@/components/lib/admin/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign-in" };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect(ADMIN_PATHS.home);
  return <LoginForm />;
}
