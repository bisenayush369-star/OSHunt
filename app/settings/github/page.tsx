import Navbar from "@/components/ui/Navbar";
import { GitHubConnectionSettings } from "@/components/github/github-connection-settings";

export default function GitHubSettingsPage() {
  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <Navbar />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6">
          <h1 className="text-2xl font-semibold">GitHub settings</h1>
          <p className="mt-2 text-sm text-white/50">Manage your OSHunt GitHub connection and disconnect whenever you want.</p>
        </div>
        <GitHubConnectionSettings />
      </main>
    </div>
  );
}
