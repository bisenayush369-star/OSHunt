import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscoveryError } from "@/types/discovery";

interface ErrorBannerProps {
  error: DiscoveryError;
  onRetry: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  if (error.type === "rate-limit") {
    return (
      <div className="rate-banner">
        <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <p>GitHub&apos;s public API limit was hit — 10 searches/minute, 60 requests/hour without a token.</p>
          <p className="sub">
            {error.resetInSeconds ? `Resets in about ${Math.ceil(error.resetInSeconds / 60)} min. ` : ""}
            In production, route this through your own /api/gems with a GITHUB_TOKEN to get 5,000/hour.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCcw size={13} strokeWidth={2} aria-hidden="true" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="rate-banner">
      <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
      <p style={{ flex: 1 }}>Couldn&apos;t reach the GitHub API just now.</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        <RotateCcw size={13} strokeWidth={2} aria-hidden="true" /> Retry
      </Button>
    </div>
  );
}
