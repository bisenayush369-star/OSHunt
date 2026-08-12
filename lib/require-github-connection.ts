import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConnectionStatus } from "@/lib/github-connection";

export async function requireGitHubConnection(currentPath: string) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  const status = await getConnectionStatus(session.user.id);

  if (!status.connected) {
    const reason = status.expired ? "expired" : "missing";
    redirect(`/connect-github?from=${encodeURIComponent(currentPath)}&reason=${reason}`);
  }

  return { userId: session.user.id, ...status };
}
