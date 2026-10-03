"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Clock, GitBranch, Infinity as InfinityIcon, Target, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

gsap.registerPlugin(useGSAP);

// Mirrors the Free and Pro cards in your pricing section.
const CONFIG = { plan: "Pro", price: "₹149", limit: 5, unit: "issue searches", upgradeHref: "/upgrade" };

const PERKS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: InfinityIcon, title: "Unlimited searches", text: "Hunt as many issues as you want." },
  { icon: GitBranch, title: "GitLense", text: "Full repo analysis before you dive in." },
  { icon: Terminal, title: "God Mode", text: "AI terminal for the tricky fixes." },
  { icon: Target, title: "Bounty Strategist", text: "A roadmap for bounty issues." },
];

const USAGE_LIMIT_REASONS = new Set([
  "github_quota_exhausted",
  "ai_quota_exhausted",
  "quota_exhausted",
  "daily_limit_reached",
]);

const pad = (n: number) => String(n).padStart(2, "0");

/*
 * Scoped styles. Uses OSHunt's own tokens (#090909 / #a8ff3e / Outfit / JetBrains Mono, pills, terminal window bar).
 * Class names are prefixed "lim-" on purpose: your page CSS already defines a global `.reveal` (opacity:0) and a
 * `*{margin:0;padding:0}` reset, so scoped classes with higher specificity keep this dialog independent of both.
 */
const css = `
.osh-limit[data-state]{--a:#a8ff3e;--t:#efefef;--m:#7d7d7d;--d:#7a7a7a;--b:rgba(255,255,255,.07);--mono:var(--font-mono,'JetBrains Mono',ui-monospace,monospace);
  display:flex;flex-direction:column;width:min(720px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);padding:0;gap:0;overflow:hidden;
  border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(16,16,16,.98),rgba(9,9,9,.98));
  box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 30px 80px -28px rgba(0,0,0,.85);color:var(--t);
  font-family:var(--font,'Outfit',system-ui,sans-serif);-webkit-font-smoothing:antialiased}
.osh-limit[data-state]>button{top:9px;right:12px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;padding:0;border-radius:50%;
  border:1px solid var(--b);background:none;color:var(--m);opacity:1;z-index:3;cursor:pointer;transition:color .2s,border-color .2s}
.osh-limit[data-state]>button:hover{color:var(--t);border-color:rgba(168,255,62,.35)}
.osh-limit[data-state]>button:focus-visible,.lim a:focus-visible,.lim button:focus-visible{outline:2px solid var(--a);outline-offset:3px;box-shadow:none}
[data-slot="dialog-overlay"]{background:rgba(0,0,0,.72)!important;backdrop-filter:blur(6px)}

.lim{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.lim-glow{position:absolute;top:-90px;left:0;right:0;margin:0 auto;width:640px;max-width:100%;height:280px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(168,255,62,.14) 0%,transparent 72%);filter:blur(50px);pointer-events:none}
.lim-grid{position:absolute;top:0;left:0;right:0;height:260px;background-image:radial-gradient(rgba(255,255,255,.07) 1.2px,transparent 1.2px);
  background-size:22px 22px;-webkit-mask-image:linear-gradient(180deg,#000,transparent 85%);mask-image:linear-gradient(180deg,#000,transparent 85%);pointer-events:none}
.lim-sweep{position:absolute;top:0;bottom:0;left:-30%;width:30%;background:linear-gradient(90deg,transparent,rgba(168,255,62,.05),transparent);
  animation:limsweep 2.8s ease-in-out infinite;pointer-events:none}
.lim-winbar{position:relative;z-index:1;display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.06)}
.lim-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0}
.lim-wintitle{position:absolute;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:12px;color:var(--d);white-space:nowrap}
.lim-body{position:relative;z-index:1;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;
  padding:clamp(1.25rem,3vw,2rem);padding-bottom:max(clamp(1.25rem,3vw,2rem),env(safe-area-inset-bottom))}

.lim .lim-title{margin:0;font-size:clamp(26px,4.4vw,34px);font-weight:800;letter-spacing:-.8px;line-height:1.1;color:var(--t);text-wrap:balance}
.lim .lim-lead{max-width:520px;margin:.7rem 0 0;font-size:15px;line-height:1.65;color:var(--m)}
.lim .lim-lead strong{color:var(--t);font-weight:600}

.lim-meter{margin-top:1.5rem;padding:1.1rem 1.25rem;border:1px solid rgba(168,255,62,.2);border-radius:16px;background:rgba(168,255,62,.03)}
.lim-meter-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .75rem}
.lim-label{margin:0;font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--d)}
.lim-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.03);color:var(--m);font-family:var(--mono);font-size:12px}
.lim-pill strong{color:var(--t);font-weight:600;font-variant-numeric:tabular-nums}
.lim-readout{display:flex;flex-wrap:wrap;align-items:baseline;gap:.15rem .6rem;margin:.9rem 0 .8rem;font-family:var(--mono);font-size:clamp(22px,4vw,28px);
  font-weight:700;color:var(--a);letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.lim-prompt{color:var(--d)}
.lim-readout small{font-size:13px;font-weight:500;letter-spacing:0;color:var(--m)}
.lim-cursor{display:inline-block;width:8px;height:16px;background:var(--a);align-self:center;animation:limblink 1s step-start infinite}
.lim-bar{height:5px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}
.lim-fill{height:100%;border-radius:999px;background:var(--a);transform-origin:left center}

.lim-sub{margin:1.6rem 0 .75rem}
.lim-perks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
.lim-perk{position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:.75rem;min-height:80px;padding:.9rem 1rem;border:1px solid rgba(255,255,255,.07);
  border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.012));box-shadow:inset 0 1px 0 rgba(255,255,255,.03);transition:border-color .2s}
.lim-perk:hover{border-color:rgba(168,255,62,.3)}
.lim-spot{position:absolute;inset:0;opacity:0;transition:opacity .3s;pointer-events:none;background:radial-gradient(180px circle at var(--x,50%) var(--y,50%),rgba(168,255,62,.1),transparent 70%)}
.lim-perk:hover .lim-spot{opacity:1}
.lim-perk svg{position:relative;flex-shrink:0;margin-top:2px;color:var(--a)}
.lim-perk-t{position:relative;font-size:13.5px;font-weight:600;letter-spacing:-.2px;color:var(--t)}
.lim-perk-d{position:relative;margin-top:2px;font-size:12.5px;line-height:1.5;color:var(--m)}

.lim-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:1.6rem}
.lim .lim-btn{height:auto;padding:12px 26px;border-radius:30px;font-family:inherit;font-size:15px;font-weight:600;letter-spacing:-.2px;white-space:nowrap;
  text-decoration:none;cursor:pointer;transition:all .15s}
.lim .lim-ghost{border:1px solid var(--b);background:none;color:var(--m);font-weight:500}
.lim .lim-ghost:hover{background:none;color:var(--t);border-color:rgba(255,255,255,.2)}
.lim .lim-primary{border:none;background:var(--a);color:#090909;animation:limglow 4s ease-in-out infinite}
.lim .lim-primary:hover{background:var(--a);color:#090909;opacity:.88;transform:translateY(-2px)}
.lim-note{margin:1rem 0 0;text-align:right;font-size:12.5px;color:var(--d)}

@keyframes limsweep{0%{transform:translateX(0)}100%{transform:translateX(420%)}}
@keyframes limblink{50%{opacity:0}}
@keyframes limglow{0%,100%{box-shadow:0 14px 28px rgba(168,255,62,.12)}50%{box-shadow:0 14px 34px rgba(168,255,62,.28)}}

@media(max-width:560px){
  .lim-perks{grid-template-columns:1fr}
  .lim-perk{min-height:0}
  .lim-actions{flex-direction:column-reverse;align-items:stretch}
  .lim .lim-btn{width:100%;justify-content:center;text-align:center}
  .lim-note{text-align:center}
}
@media(prefers-reduced-motion:reduce){
  .lim-sweep{display:none}
  .lim-cursor,.lim .lim-primary{animation:none!important}
  .lim .lim-btn,.lim-perk,.lim-spot{transition:none!important}
}
`;

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
      className="lim-perk"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
    >
      <span className="lim-spot" aria-hidden />
      <Icon aria-hidden size={18} />
      <div>
        <div className="lim-perk-t">{title}</div>
        <div className="lim-perk-d">{text}</div>
      </div>
    </div>
  );
}

function LimitDialog({ open, onOpenChange, resetAt }: { open: boolean; onOpenChange: (o: boolean) => void; resetAt: Date }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="osh-limit">
        <style>{css}</style>
        <LimitBody resetAt={resetAt} onWait={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function LimitBody({ resetAt, onWait }: { resetAt: Date; onWait: () => void }) {
  const { plan, price, limit, unit, upgradeHref } = CONFIG;
  const root = useRef<HTMLDivElement>(null);
  const used = useRef<HTMLSpanElement>(null);
  const { left, h, m, s } = useCountdown(resetAt);
  const time = resetAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Motion only when the user hasn't asked to reduce it; otherwise everything renders in its final state.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(".lim-glow", { x: 36, y: 14, scale: 1.08, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap
          .timeline({ defaults: { ease: "expo.out" } }) // expo.out = your cubic-bezier(.16,1,.3,1)
          .from(".lim-r", { y: 26, opacity: 0, duration: 0.8, stagger: 0.07 })
          .from(".lim-fill", { scaleX: 0, duration: 1 }, 0.2)
          .from(".lim-perk", { y: 18, opacity: 0, duration: 0.7, stagger: 0.07 }, 0.45);

        const n = { v: 0 };
        gsap.to(n, {
          v: limit, duration: 1, delay: 0.2, ease: "expo.out",
          onUpdate: () => { if (used.current) used.current.textContent = String(Math.round(n.v)); },
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [] },
  );

  return (
    <div ref={root} className="lim">
      <div className="lim-glow" aria-hidden />
      <div className="lim-grid" aria-hidden />
      <div className="lim-sweep" aria-hidden />

      <div className="lim-winbar">
        <span className="lim-dot" style={{ background: "#ff5f56" }} />
        <span className="lim-dot" style={{ background: "#ffbd2e" }} />
        <span className="lim-dot" style={{ background: "#27c93f" }} />
        <span className="lim-wintitle">oshunt ~ usage</span>
      </div>

      <div className="lim-body">
        <DialogTitle className="lim-title lim-r">Daily limit reached</DialogTitle>
        <DialogDescription className="lim-lead lim-r">
          You&apos;ve used all <strong>{limit} free {unit}</strong> for today. Your limit resets at {time}, or you can
          upgrade to {plan} for unlimited searches.
        </DialogDescription>

        <div className="lim-meter lim-r">
          <div className="lim-meter-top">
            <p className="lim-label">Usage today</p>
            <span className="lim-pill">
              <Clock aria-hidden size={13} />
              {left === 0 ? "Limit reset" : <>Resets in <strong>{pad(h)}:{pad(m)}:{pad(s)}</strong></>}
            </span>
          </div>
          <div className="lim-readout">
            <span className="lim-prompt">&gt;</span>
            <span><span ref={used}>{limit}</span>/{limit}</span>
            <small>{unit} used</small>
            <i className="lim-cursor" aria-hidden />
          </div>
          <div
            className="lim-bar"
            role="progressbar"
            aria-label={`${limit} of ${limit} ${unit} used today`}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={limit}
          >
            <div className="lim-fill" />
          </div>
        </div>

        <p className="lim-label lim-sub lim-r">{plan} unlocks</p>
        <div className="lim-perks">
          {PERKS.map((p) => (
            <PerkCard key={p.title} {...p} />
          ))}
        </div>

        <div className="lim-actions lim-r">
          <Button variant="ghost" onClick={onWait} className="lim-btn lim-ghost">
            {left === 0 ? "Continue" : "I'll wait"}
          </Button>
          <Button asChild className="lim-btn lim-primary">
            <a href={upgradeHref}>Upgrade to {plan}</a>
          </Button>
        </div>
        <p className="lim-note lim-r">{price} per month. Cancel anytime.</p>
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