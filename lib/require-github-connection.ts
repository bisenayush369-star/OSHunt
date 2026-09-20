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
    // Redirect to the sign-in page so users can authenticate with GitHub.
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  return { userId: session.user.id, ...status };
}
