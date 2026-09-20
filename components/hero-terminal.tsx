"use client";
import { useEffect, useRef, useState } from "react";
import { JetBrains_Mono } from "next/font/google";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface Step {
  id: string;
  label: string;
  running: string;
  done: string;
  ms: number;
}

const STEPS: Step[] = [
  {
    id: "godmode",
    label: "God Mode",
    running: "mapping dependency tree",
    done: "340 dependencies mapped · 3 risks flagged",
    ms: 812,
  },
  {
    id: "bounty",
    label: "Bounty Strategist",
    running: "scoring issues by effort vs. reward",
    done: "6 issues ranked · top pick 2hr / high impact",
    ms: 340,
  },
  {
    id: "gitlense",
    label: "GitLense",
    running: "explaining repo architecture",
    done: "breakdown ready for 3 personas",
    ms: 610,
  },
  {
    id: "trending",
    label: "Trending",
    running: "pulling live GitHub activity",
    done: "12 new repos matched to your stack",
    ms: 455,
  },
];

const TOTAL_MS = STEPS.reduce((sum, s) => sum + s.ms, 0);
const TYPE_SPEED = 26;
const HOLD_RUNNING = 550;
const HOLD_BETWEEN = 320;
const HOLD_FULL_LOG = 2600;
const FADE_MS = 350;

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface TerminalRow {
  id: string;
  label: string;
  text: string;
  status: "running" | "done";
  ms?: number;
}

interface HeroLiveTerminalProps {
  username?: string;
}

// The animated "oshunt scan" terminal shown in the hero. Styles are all
// namespaced with an `hlt-` prefix and keyframes are prefixed the same way
// so this can sit inside page.tsx's global <style> environment without
// colliding with its class names or its own `blink` keyframe.
export default function HeroLiveTerminal({ username = "torvalds" }: HeroLiveTerminalProps) {
  const [commandTyped, setCommandTyped] = useState("");
  const [showCmdCursor, setShowCmdCursor] = useState(true);
  const [rows, setRows] = useState<TerminalRow[]>([]);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [idlePrompt, setIdlePrompt] = useState(false);
  const [fading, setFading] = useState(false);
  const [issuesMatched, setIssuesMatched] = useState(1842);

  const cancelledRef = useRef(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const COMMAND = `oshunt scan ${username} --deep`;

  useEffect(() => {
    cancelledRef.current = false;

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // The CSS keyframes already no-op under reduced motion, but the typing/step
      // loop below is driven by setTimeout, not CSS — so it would keep animating
      // regardless. Show the finished state once, statically, instead.
      setCommandTyped(COMMAND);
      setShowCmdCursor(false);
      setRows(STEPS.map((step) => ({ id: step.id, label: step.label, text: step.done, status: "done" as const, ms: step.ms })));
      setSummaryVisible(true);
      setIdlePrompt(true);
      return;
    }

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        timeouts.current.push(t);
      });

    async function typeCommand() {
      setCommandTyped("");
      for (let i = 1; i <= COMMAND.length; i++) {
        if (cancelledRef.current) return;
        setCommandTyped(COMMAND.slice(0, i));
        await wait(TYPE_SPEED);
      }
    }

    async function runLoop() {
      while (!cancelledRef.current) {
        timeouts.current = [];
        setRows([]);
        setSummaryVisible(false);
        setIdlePrompt(false);
        setFading(false);
        setShowCmdCursor(true);

        await typeCommand();
        if (cancelledRef.current) return;
        await wait(300);
        if (cancelledRef.current) return;
        setShowCmdCursor(false);

        for (const step of STEPS) {
          if (cancelledRef.current) return;
          setRows((prev) => [
            ...prev,
            {
              id: step.id,
              label: step.label,
              text: step.running,
              status: "running",
            },
          ]);
          await wait(HOLD_RUNNING);
          if (cancelledRef.current) return;
          setRows((prev) =>
            prev.map((r) =>
              r.id === step.id
                ? { ...r, text: step.done, status: "done", ms: step.ms }
                : r,
            ),
          );
          await wait(HOLD_BETWEEN);
        }

        if (cancelledRef.current) return;
        setSummaryVisible(true);
        await wait(500);
        if (cancelledRef.current) return;
        setIdlePrompt(true);

        await wait(HOLD_FULL_LOG);
        if (cancelledRef.current) return;
        setFading(true);
        await wait(FADE_MS);
      }
    }

    runLoop();

    return () => {
      cancelledRef.current = true;
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, [username]);

  useEffect(() => {
    const id = setInterval(() => {
      setIssuesMatched((n) => n + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={"hlt-terminal " + mono.className}>
      <style>{`
        .hlt-terminal { --hlt-accent: var(--accent, #a8ff3e); width: 100%; max-width: 460px; min-height: 480px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); display: flex; flex-direction: column; position: relative; z-index: 2; }
        .hlt-terminal *,.hlt-terminal *::before,.hlt-terminal *::after { box-sizing: border-box; }

        .hlt-header { display:flex; align-items:center; justify-content:space-between; padding:13px 18px; border-bottom:1px solid rgba(255,255,255,0.1); }
        .hlt-dots { display:flex; align-items:center; gap:9px; }
        .hlt-dot { width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,0.15); }
        .hlt-filename { margin-left:6px; font-size:11.5px; color:rgba(255,255,255,0.35); }
        .hlt-live { display:flex; align-items:center; gap:7px; }
        .hlt-ping-wrap { position:relative; width:8px; height:8px; display:inline-block; }
        .hlt-ping { position:absolute; inset:0; border-radius:50%; background:var(--hlt-accent); opacity:0.6; animation:hltPing 1.6s cubic-bezier(0,0,0.2,1) infinite; }
        .hlt-live-dot { position:relative; display:block; width:8px;height:8px;border-radius:50%;background:var(--hlt-accent); }
        .hlt-live-label { font-size:10.5px; letter-spacing:0.08em; color:var(--hlt-accent); font-weight:600; }

        .hlt-body { flex:1; padding:20px 20px 6px; font-size:13px; line-height:1.85; transition:opacity .3s ease; min-width: 0; overflow: hidden; }
        .hlt-prompt { color:var(--hlt-accent); }
        .hlt-cmdline { color:rgba(255,255,255,0.85); display:flex; align-items:center; gap:0; overflow:hidden; min-width:0; }
        .hlt-cmdline .hlt-cmdtext { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .hlt-cursor { display:inline-block; width:7px; height:1em; background:var(--hlt-accent); vertical-align:middle; margin-left:3px; flex-shrink:0; border-radius:2px; box-shadow:0 0 6px rgba(168,255,62,0.10); animation:hltBlink 650ms step-end infinite; opacity:1; }
        .hlt-rows { display:flex; flex-direction:column; gap:10px; min-width:0; }
        .hlt-row { display:flex; align-items:center; gap:11px; min-width:0; opacity:0; animation:hltRowIn .3s ease-out forwards; }
        .hlt-row-icon { flex-shrink:0; width:14px; height:14px; display:inline-flex; }
        .hlt-row-icon.running { color:rgba(255,255,255,0.4); animation:hltSpin 0.9s linear infinite; }
        .hlt-row-icon.done { color:var(--hlt-accent); }
        .hlt-row-label { flex-shrink:0; white-space:nowrap; color:rgba(255,255,255,0.5); max-width: 38%; overflow: hidden; text-overflow: ellipsis; }
        .hlt-row-label.done { color:rgba(255,255,255,0.9); }
        .hlt-row-text { flex:1; min-width:0; color:rgba(255,255,255,0.35); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .hlt-row-text.done { color:rgba(255,255,255,0.55); }
        .hlt-row-ms { flex-shrink:0; margin-left:8px; color:rgba(255,255,255,0.25); }
        .hlt-summary { margin-top:16px; padding-top:13px; border-top:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); opacity:0; animation:hltRowIn .3s ease-out forwards; display:flex; align-items:center; gap:8px; }
        .hlt-summary .hlt-lime { color:var(--hlt-accent); display:inline-flex; flex-shrink:0; }
        .hlt-idle { margin-top:11px; color:rgba(255,255,255,0.85); opacity:0; animation:hltRowIn .3s ease-out forwards; }

        .hlt-footer { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid rgba(255,255,255,0.1); }
        .hlt-stat { padding:16px 18px; min-width:0; }
        .hlt-stat:first-child { border-right:1px solid rgba(255,255,255,0.1); }
        .hlt-stat-label { font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; color:rgba(255,255,255,0.35); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .hlt-stat-value { margin-top:4px; font-size:17px; color:rgba(255,255,255,0.9); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        @keyframes hltBlink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
        @keyframes hltSpin { to { transform:rotate(360deg); } }
        @keyframes hltPing { 75%,100% { transform:scale(2); opacity:0; } }
        @keyframes hltRowIn { from{opacity:0; transform:translateY(4px);} to{opacity:1; transform:translateY(0);} }

        @media (max-width:1024px) { .hlt-terminal { min-height:420px; max-width:560px; } }
        @media (max-width:560px) {
          .hlt-terminal { min-height:360px; }
          .hlt-header { padding:11px 14px; }
          .hlt-body { padding:16px 16px 4px; font-size:12px; }
          .hlt-stat { padding:13px 14px; }
          .hlt-stat-value { font-size:15px; }
          .hlt-filename { font-size:10.5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hlt-terminal *, .hlt-terminal *::before, .hlt-terminal *::after { animation-duration:0.001ms !important; animation-iteration-count:1 !important; }
        }
      `}</style>

      <div className="hlt-header">
        <div className="hlt-dots">
          <span className="hlt-dot" />
          <span className="hlt-dot" />
          <span className="hlt-dot" />
          <span className="hlt-filename">oshunt · scan</span>
        </div>
        <div className="hlt-live">
          <span className="hlt-ping-wrap">
            <span className="hlt-ping" />
            <span className="hlt-live-dot" />
          </span>
          <span className="hlt-live-label">LIVE</span>
        </div>
      </div>

      <div className="hlt-body" style={{ opacity: fading ? 0 : 1 }}>
        <div className="hlt-cmdline">
          <span className="hlt-prompt">$&nbsp;</span>
          <span className="hlt-cmdtext">{commandTyped}{showCmdCursor && <span className="hlt-cursor" />}</span>
        </div>

        {rows.length > 0 && <div style={{ height: 16 }} />}

        <div className="hlt-rows">
          {rows.map((row) => (
            <div key={row.id} className="hlt-row">
              <span className={"hlt-row-icon " + row.status}>
                {row.status === "done" ? <IconCheck /> : <IconSpin />}
              </span>
              <span className={"hlt-row-label " + row.status}>{row.label}</span>
              <span className={"hlt-row-text " + row.status}>
                {row.text}
                {row.status === "running" && <span>…</span>}
              </span>
              {row.status === "done" && row.ms ? (
                <span className="hlt-row-ms">{row.ms}ms</span>
              ) : null}
            </div>
          ))}
        </div>

        {summaryVisible && (
          <div className="hlt-summary">
            <span className="hlt-lime">
              <IconCheck />
            </span>
            <span>4 tools complete · {(TOTAL_MS / 1000).toFixed(1)}s</span>
          </div>
        )}

        {idlePrompt && (
          <div className="hlt-idle">
            <span className="hlt-prompt">$</span> <span className="hlt-cursor" />
          </div>
        )}
      </div>

      <div className="hlt-footer">
        <div className="hlt-stat">
          <div className="hlt-stat-label">Issues matched today</div>
          <div className="hlt-stat-value">{issuesMatched.toLocaleString()}</div>
        </div>
        <div className="hlt-stat">
          <div className="hlt-stat-label">Repos indexed</div>
          <div className="hlt-stat-value">48,209</div>
        </div>
      </div>
    </div>
  );
}