"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/lib/utils";
import type { AnalysisResult, AnalysisStep } from "@/components/lib/analysis";
import { useEffect, useMemo, useState } from "react";
import { BeginnerIssues } from "@/components/analysis/BeginnerIssues";
import { RepoChat } from "@/components/analysis/RepoChat";
import { RepoMap } from "@/components/analysis/RepoMap";
import "@/components/analysis/analysis.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface AnalysisViewProps {
  owner: string;
  repo: string;
}

const defaultMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "I can help you find the best place to start in this repo.",
  },
];

function FitRing({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(score, 100));
  const gradient = `conic-gradient(#a8ff3e ${safeScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`;

  return (
    <div className="fit-ring" style={{ background: gradient }}>
      <div className="fit-ring-inner">
        <span>{safeScore}</span>
        <small>fit</small>
      </div>
    </div>
  );
}

function StepRail({ steps }: { steps: AnalysisStep[] }) {
  return (
    <div className="analysis-path-rail" aria-label="Contribution journey">
      {steps.map((step, index) => (
        <div key={`${step.title}-${index}`} className="analysis-path-item">
          <span className="analysis-path-dot" aria-hidden="true" />
          <div>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
            {step.cmd && <code>{step.cmd}</code>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalysisView({ owner, repo }: AnalysisViewProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<"not_found" | "failed" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [sheetOpen, setSheetOpen] = useState(false);

  const heading = useMemo(() => `${owner}/${repo}`, [owner, repo]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setErrorMessage("");
      setResult(null);
      setProgress([]);

      try {
        const res = await fetch("/api/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({ error: "failed" }))) as { error?: string; message?: string };
          if (!cancelled) {
            setError(body.error === "not_found" ? "not_found" : "failed");
            setErrorMessage(body.message ?? "");
            setLoading(false);
          }
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (!reader) {
          if (!cancelled) {
            setError("failed");
            setLoading(false);
          }
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const payload = JSON.parse(trimmed) as { step?: string; result?: AnalysisResult; error?: "not_found" | "failed"; message?: string };
            if (typeof payload.step === "string") {
              if (!cancelled) setProgress((current) => [...current, payload.step as string]);
              continue;
            }
            if (payload.result) {
              if (!cancelled) {
                setResult(payload.result);
                setLoading(false);
                setMessages((current) => {
                  const next = [...current];
                  const hasIntro = next.some((message) => message.content.includes("best place to start"));
                  if (!hasIntro) {
                    next.push({ role: "assistant", content: "I found the best first steps for this repo. Ask me anything about it." });
                  }
                  return next;
                });
              }
              continue;
            }
            if (payload.error) {
              if (!cancelled) {
                setError(payload.error);
                setErrorMessage(payload.message ?? "");
                setLoading(false);
              }
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError("failed");
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  const handleChatSend = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !result) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/analysis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, messages: nextMessages }),
      });

      const body = (await res.json().catch(() => ({ reply: "I need one more pass on this repo before I can answer that." }))) as {
        reply?: string;
        error?: string;
      };

      if (!res.ok) {
        setMessages((current) => [...current, { role: "assistant", content: "I can only help with this repo, and the repo guide is not ready yet." }]);
        return;
      }

      setMessages((current) => [...current, { role: "assistant", content: body.reply ?? "I can only help with this repo." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I hit a small problem while answering. Try a shorter question." }]);
    }
  };

  const activeResult = result ?? null;

  return (
    <div className="analysis-page-shell">
      <div className="analysis-page-header">
        <div>
          <p className="analysis-kicker">Open source guide</p>
          <h1>{heading}</h1>
        </div>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>

      <div className="analysis-layout">
        <main className="analysis-main-panel">
          {(loading || activeResult) && !error && (
            <>
              {loading && (
                <Card className="analysis-loading-card">
                  <div className="analysis-loading-header">
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="analysis-progress-list">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="analysis-progress-step">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {!loading && activeResult && (
                <div className="analysis-content">
                  <Card className="analysis-summary-card">
                    <div className="analysis-summary-row">
                      <div className="analysis-summary-copy">
                        <p className="analysis-kicker">Summary</p>
                        <p>{activeResult.summary}</p>
                      </div>
                      <FitRing score={activeResult.fit.score} />
                    </div>

                    <div className="analysis-fit-box">
                      <div className="analysis-fit-topline">
                        <strong>{activeResult.fit.label}</strong>
                        <span>{activeResult.fit.score}/100</span>
                      </div>
                      <ul>
                        {activeResult.fit.reasons.map((reason, index) => (
                          <li key={`${reason.text}-${index}`} className={cn(reason.ok ? "ok" : "warn")}>
                            <span aria-hidden="true">{reason.ok ? "✓" : "•"}</span>
                            {reason.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>

                  <Card className="analysis-guide-card">
                    <div className="section-header">
                      <p className="analysis-kicker">How to start</p>
                      <h2>Contribution path</h2>
                    </div>
                    <StepRail steps={activeResult.steps} />
                  </Card>

                  <div className="analysis-lower-grid">
                    <Card className="analysis-guide-card">
                      <div className="section-header">
                        <p className="analysis-kicker">Repo map</p>
                        <h2>Where to look</h2>
                      </div>
                      <RepoMap full={`${owner}/${repo}`} starts={[]} />
                    </Card>

                    <Card className="analysis-issues-card">
                      <div className="section-header">
                        <p className="analysis-kicker">Beginner issues</p>
                        <h2>Good first tasks</h2>
                      </div>
                      <BeginnerIssues
                        full={`${owner}/${repo}`}
                        onAsk={(text, context) => {
                          const prompt = context ? `${text}\n\nContext:\n${context}` : text;
                          void handleChatSend(prompt);
                        }}
                      />
                    </Card>
                  </div>

                  <Card className="analysis-watch-card">
                    <div className="section-header">
                      <p className="analysis-kicker">Watch out</p>
                      <h2>Before you start</h2>
                    </div>
                    <ul className="analysis-watch-list">
                      {activeResult.watch.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}
            </>
          )}

          {!loading && !activeResult && error && (
            <Card className="analysis-error-card">
              <p className="analysis-kicker">Could not analyze</p>
              <h2>{error === "not_found" ? "This repo was not found or is not public." : "Something went wrong while building your guide."}</h2>
              <p>
                {error === "not_found"
                  ? "Check the repo name and try again."
                  : errorMessage || "The analysis did not finish, so a guide is not available right now."}
              </p>
              <Button type="button" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </Card>
          )}

          {progress.length > 0 && loading && (
            <div className="analysis-live-progress">
              {progress.map((item, index) => (
                <div key={`${item}-${index}`} className="analysis-progress-pill">
                  {item}
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="analysis-chat-sidebar">
          <RepoChat
            messages={messages}
            onSend={handleChatSend}
            disabled={!result}
            isLoading={loading}
          />
        </aside>
      </div>

      <div className={cn("analysis-mobile-sheet", sheetOpen && "open")}>
        <div className="analysis-mobile-sheet-handle" />
        <RepoChat
          messages={messages}
          onSend={handleChatSend}
          disabled={!result}
          isLoading={loading}
          onOpen={() => setSheetOpen(false)}
          open={sheetOpen}
        />
      </div>

      <Button type="button" className="analysis-sheet-toggle" onClick={() => setSheetOpen((current) => !current)}>
        {sheetOpen ? "Hide chat" : "Open chat"}
      </Button>
    </div>
  );
}
