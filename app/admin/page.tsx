import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Console } from "@/components/admin/console";
import { isAdmin } from "@/components/lib/admin/session";

export const dynamic = "force-dynamic";

/** The title is only set for the owner: a visitor's 404 must carry nothing that names the admin. */
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "OSHunt admin", robots: { index: false, follow: false } } : {};
}

/** The dashboard. Anyone without the owner cookie gets the same 404 as any page that does not exist. */
export default async function AdminPage() {
  const localDevBypass = process.env.NODE_ENV !== "production";

  if (!(await isAdmin())) {
    if (localDevBypass) redirect("/admin/login");
    notFound();
  }

  return <Console />;
}
