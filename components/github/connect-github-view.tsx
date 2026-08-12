"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GitHubMark, CheckIcon, SpinnerIcon } from "./github-icons";

const BENEFITS = [
  "Unlimited GitHub-powered features",
  "Uses your own GitHub API quota",
  "Faster responses",
  "Secure OAuth authentication",
  "We never access your password",
  "Disconnect anytime",
];

const PERMISSIONS = [
  "Read your public repositories",
  "Read your profile",
  "Read repository metadata",
];

export function ConnectGithubView({
  returnTo,
  expired = false,
  onDismiss,
  error,
}: {
  returnTo: string;
  expired?: boolean;
  onDismiss?: () => void;
  error?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);
  const normalizedError = error?.toLowerCase();
  const isCancelled = normalizedError === "cancelled" || normalizedError === "access_denied" || normalizedError === "user_denied";
  const isAlreadyLinked = normalizedError === "already-linked";
  const infoMessage = isCancelled
    ? "You said no to GitHub access. No problem — you can try again whenever you’re ready."
    : isAlreadyLinked
      ? "That GitHub account is already linked to another OSHunt account. Please use a different account or disconnect the existing link first."
      : normalizedError
        ? "Something went wrong while connecting GitHub. Please try again."
        : null;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (cardElement == null) return;
    const card = cardElement as HTMLDivElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    function handleMove(e: MouseEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--y", `${e.clientY - rect.top}px`);
      });
    }
    card.addEventListener("mousemove", handleMove);
    return () => {
      card.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "github-connect-success" || event.data?.type === "github-connect-error") {
        setRedirecting(false);
        setPopupError(null);
        if (event.data?.type === "github-connect-success") {
          window.location.reload();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleConnect = () => {
    setRedirecting(true);
    setPopupError(null);

    const popup = window.open(
      `/api/github/connect?from=${encodeURIComponent(returnTo)}&popup=1`,
      "github-connect",
      "width=600,height=760,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no"
    );

    if (!popup) {
      setRedirecting(false);
      setPopupError("Please allow popups for GitHub connect.");
      return;
    }

    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        setRedirecting(false);
      }
    }, 500);
  };

  return (
    <div ref={cardRef} className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "18px 18px", maskImage: "radial-gradient(ellipse at top, black, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at top, black, transparent 75%)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100" style={{ background: "radial-gradient(320px circle at var(--x, 50%) var(--y, 0%), rgba(168,255,62,0.10), transparent 70%)" }} />

      <div className="relative px-6 py-9 sm:px-9 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div aria-hidden="true" className="absolute inset-0 rounded-2xl bg-[#a8ff3e] opacity-20 blur-2xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/3">
              <GitHubMark className="h-7 w-7 text-white" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-white sm:text-2xl">{expired ? "Reconnect GitHub" : "Connect GitHub"}</h1>
          <p className="mt-2 max-w-xs text-sm text-white/50">
            {expired ? "Your GitHub connection expired. Reconnect to keep using GitHub-powered features." : "Connect your GitHub account to unlock all GitHub-powered features inside OSHunt."}
          </p>
        </div>

        <ul className="mt-8 space-y-3">
          {BENEFITS.map((benefit, i) => (
            <li key={benefit} className="flex items-center gap-3 text-sm text-white/80 transition-all duration-500 ease-out" style={{ transitionDelay: `${i * 70}ms`, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(8px)" }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a8ff3e]/10 text-[#a8ff3e]">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/2 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/35">Permissions</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {PERMISSIONS.map((permission) => (
              <li key={permission} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a8ff3e]" />
                {permission}
              </li>
            ))}
          </ul>
        </div>

        {infoMessage ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/3 p-4 text-left">
            <p className="text-sm font-medium text-white">
              {isCancelled ? "No problem" : isAlreadyLinked ? "That account is already connected" : "We hit a snag"}
            </p>
            <p className="mt-1 text-sm text-white/60">{infoMessage}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={handleConnect}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a8ff3e] px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-[#bbff66]"
            disabled={redirecting}
          >
            {redirecting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <GitHubMark className="h-4 w-4" />}
            {redirecting ? "Opening popup…" : expired ? "Reconnect GitHub" : "Continue with GitHub"}
          </button>

          {popupError ? <p className="text-center text-sm text-red-400">{popupError}</p> : null}

          {onDismiss ? (
            <button onClick={() => onDismiss()} className="text-sm text-white/40 transition-colors hover:text-white/70">
              Maybe later
            </button>
          ) : (
            <Link href="/dashboard" className="text-center text-sm text-white/40 transition-colors hover:text-white/70">
              Back to dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
