"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function ConnectGithubButton({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn("github", { callbackUrl: returnTo });
    } catch (err) {
      setError("Failed to open GitHub sign-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleConnect}
        className="cta-ghost"
        disabled={loading}
      >
        {loading ? "Opening GitHub…" : "Connect GitHub"}
      </button>
      {error ? <div className="text-sm text-red-400 mt-2">{error}</div> : null}
    </div>
  );
}
