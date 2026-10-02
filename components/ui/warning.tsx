"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BellRing, Clock, Infinity as InfinityIcon, SlidersHorizontal, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

gsap.registerPlugin(useGSAP);

const CONFIG = {
  product: "OSHunt",
  plan: "Pro",
  limit: 10,
  unit: "searches",
  upgradeHref: "/pricing",
};

const PERKS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: InfinityIcon, title: "Unlimited usage", text: "No daily cap on what you can do." },
  { icon: Zap, title: "Priority speed", text: "Skip the queue when it's busy." },
  { icon: SlidersHorizontal, title: "Advanced filters", text: "Narrow results with finer control." },
  { icon: BellRing, title: "Alerts", text: "Get notified when things change." },
];

const USAGE_LIMIT_REASONS = new Set([
  "github_quota_exhausted",
  "ai_quota_exhausted",
  "quota_exhausted",
  "daily_limit_reached",
]);

const pad = (n: number) => String(n).padStart(2, "0");

function useCountdown(target: Date) {
  const calc = () => Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);

  return { left, h: Math.floor(left / 3600), m: Math.floor((left % 3600) / 60), s: left % 60 };
}

function PerkCard({ icon: Icon, title, text }: (typeof PERKS)[number]) {
  return (
    <div
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className="perk group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25"
    >
      {/* cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(180px_circle_at_var(--x,50%)_var(--y,50%),rgba(125,211,252,0.16),transparent_70%)]"
      />
      <Icon aria-hidden className="relative mb-3 size-5 text-sky-300" />
      <h3 className="relative text-sm font-semibold text-zinc-50 [overflow-wrap:anywhere]">{title}</h3>
      <p className="relative mt-1 text-[13px] leading-snug text-zinc-400">{text}</p>
    </div>
  );
}

function LimitDialog({ open, onOpenChange, resetAt }: { open: boolean; onOpenChange: (o: boolean) => void; resetAt: Date }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* "dark" re-themes shadcn tokens (close button, focus rings) inside the portal */}
      <DialogContent className="dark w-[calc(100%-1.5rem)] max-w-none gap-0 overflow-hidden rounded-2xl border-0 bg-transparent p-px shadow-2xl shadow-black/60 sm:max-w-[760px]">
        <LimitBody resetAt={resetAt} onWait={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function LimitBody({ resetAt, onWait }: { resetAt: Date; onWait: () => void }) {
  const { product, plan, limit, unit, upgradeHref } = CONFIG;
  const root = useRef<HTMLDivElement>(null);
  const used = useRef<HTMLSpanElement>(null);
  const { left, h, m, s } = useCountdown(resetAt);
  const time = resetAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  useGSAP(
    () => {
      gsap.set(".beam", { xPercent: -50, yPercent: -50 });
      const mm = gsap.matchMedia();
      // Motion only for users who haven't asked to reduce it; otherwise everything renders in its final state.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(".beam", { rotation: 360, duration: 7, ease: "none", repeat: -1 });
        gsap.to(".blob-a", { x: 40, y: 18, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".blob-b", { x: -36, y: -14, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".sheen", { xPercent: 600, duration: 1.1, ease: "power2.inOut", repeat: -1, repeatDelay: 2.6 });

        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".reveal", { y: 14, opacity: 0, duration: 0.5, stagger: 0.07 })
          .from(".bar-fill", { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power2.inOut" }, 0.15)
          .from(".perk", { y: 18, opacity: 0, duration: 0.5, stagger: 0.08 }, 0.4);

        const n = { v: 0 };
        gsap.to(n, {
          v: limit, duration: 0.9, delay: 0.15, ease: "power2.inOut",
          onUpdate: () => { if (used.current) used.current.textContent = String(Math.round(n.v)); },
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [] },
  );

  return (
    <div ref={root} className="contents">
      {/* rotating border beam, visible only in the 1px gap around the panel */}
      <div
        aria-hidden
        className="beam absolute left-1/2 top-1/2 aspect-square w-[200%] bg-[conic-gradient(from_0deg,transparent_0_60%,#2dd4bf_82%,#7dd3fc_100%)]"
      />

      <div className="relative max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-[15px] bg-zinc-950 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8">
        {/* aurora + grid header */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
          <div className="blob-a absolute -left-16 -top-24 size-72 rounded-full bg-sky-400/25 blur-3xl" />
          <div className="blob-b absolute -right-10 -top-28 size-64 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        </div>

        <div className="relative">
          <DialogTitle className="reveal pr-8 font-serif text-2xl font-semibold leading-tight text-balance text-zinc-50 sm:text-3xl">
            Daily limit reached
          </DialogTitle>
          <DialogDescription className="reveal mt-3 max-w-[62ch] text-base leading-relaxed text-zinc-400">
            You&apos;ve used all <strong className="font-semibold text-zinc-50">{limit} free {unit}</strong> for today.
            Your limit resets at {time}, or you can upgrade for higher limits.
          </DialogDescription>

          {/* usage meter + live countdown */}
          <div className="reveal mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-zinc-400">
              <span className="tabular-nums">
                <span ref={used}>{limit}</span> of {limit} {unit} used today
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden className="size-3.5" />
                {left === 0 ? "Your limit has reset" : "Resets in"}
                {left > 0 && <span className="font-mono tabular-nums text-zinc-50">{pad(h)}:{pad(m)}:{pad(s)}</span>}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${limit} of ${limit} ${unit} used today`}
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-valuenow={limit}
              className="h-2 overflow-hidden rounded-full bg-white/10"
            >
              <div className="bar-fill h-full w-full rounded-full bg-gradient-to-r from-teal-300 to-sky-300" />
            </div>
          </div>

          <p className="reveal mb-3 mt-7 text-base text-zinc-400">
            Plus, get more with {product} {plan}:
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PERKS.map((p) => (
              <PerkCard key={p.title} {...p} />
            ))}
          </div>

          <div className="reveal mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={onWait}
              className="h-11 w-full cursor-pointer text-zinc-300 hover:bg-white/10 hover:text-white sm:w-auto"
            >
              {left === 0 ? "Continue" : "I'll wait"}
            </Button>
            <Button
              asChild
              className="relative h-11 w-full cursor-pointer overflow-hidden bg-white px-6 font-semibold text-zinc-950 hover:bg-zinc-200 sm:w-auto"
            >
              <a href={upgradeHref}>
                <span
                  aria-hidden
                  className="sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 bg-gradient-to-r from-transparent via-sky-300/60 to-transparent"
                />
                <Sparkles aria-hidden className="size-4" />
                Upgrade to {plan}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsageLimitWarning() {
  const [open, setOpen] = useState(false);
  const [resetAt, setResetAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));

  const triggerLimit = useCallback((detail?: { resetAt?: string | number; reason?: string }) => {
    if (detail?.resetAt) {
      const nextReset = new Date(detail.resetAt);
      if (!Number.isNaN(nextReset.getTime())) {
        setResetAt(nextReset);
      }
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const wrappedFetch = async (...args: Parameters<typeof window.fetch>) => {
      const response = await originalFetch(...args);

      if (response.status === 403 || response.status === 429) {
        try {
          const payload = await response.clone().json();
          const reason = typeof payload?.reason === "string"
            ? payload.reason
            : typeof payload?.error === "string"
              ? payload.error
              : "";

          if (USAGE_LIMIT_REASONS.has(reason)) {
            const retryAfter = Number(response.headers.get("Retry-After") || 0);
            const nextReset = retryAfter > 0 ? new Date(Date.now() + retryAfter * 1000) : new Date(Date.now() + 60 * 60 * 1000);
            triggerLimit({ resetAt: nextReset.toISOString(), reason });
          }
        } catch {
          // ignore parse errors; this is only a UX hook
        }
      }

      return response;
    };

    const handleLimitEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ resetAt?: string | number; reason?: string }>).detail;
      if (detail) triggerLimit(detail);
    };

    window.fetch = wrappedFetch as typeof window.fetch;
    window.addEventListener("usage-limit-hit", handleLimitEvent);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("usage-limit-hit", handleLimitEvent);
    };
  }, [triggerLimit]);

  return <LimitDialog open={open} onOpenChange={setOpen} resetAt={resetAt} />;
}

export default UsageLimitWarning;