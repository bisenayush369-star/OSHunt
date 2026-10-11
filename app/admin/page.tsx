import { redirect } from "next/navigation";
import { Console } from "@/components/admin/console";
import { ADMIN_PATHS } from "@/components/lib/admin/contract";
import { isAdmin } from "@/components/lib/admin/session";

export const dynamic = "force-dynamic";

/**
 * Server component. It only does the auth check, so a signed-out visitor is redirected
 * before any admin markup is sent. All data is loaded by the client through useAdminSync;
 * rendering no data on the server also keeps relative times and local dates free of
 * hydration mismatches.
 */
export default async function AdminPage() {
  if (!(await isAdmin())) redirect(ADMIN_PATHS.login);
  return <Console />;
}
