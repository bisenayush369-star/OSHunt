import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConnectionStatus } from "@/lib/github-connection";
import { ConnectGithubView } from "@/components/github/connect-github-view";

export default async function ConnectGithubPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string; error?: string }>;
}) {
  const { from, reason, error } = await searchParams;
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (reason) query.set("reason", reason);
  if (error) query.set("error", error);
  const returnTo = `/connect-github${query.toString() ? `?${query.toString()}` : ""}`;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  const status = await getConnectionStatus(session.user.id);
  if (status.connected) {
    redirect(from || "/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-16">
      <ConnectGithubView returnTo={from || "/dashboard"} expired={reason === "expired"} error={error} />
    </main>
  );
}
