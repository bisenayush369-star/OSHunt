"use client";

import { Bookmark, Clock, GitFork, RotateCcw, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderGit2 } from "lucide-react";
import { languageColor } from "@/lib/discovery/colors";
import { formatCount, timeAgo } from "@/lib/discovery/utils";
import { reliabilityScoreFactors } from "@/lib/discovery/ranking";
import { AiReveal } from "./AiReveal";
import { Tooltip } from "./Tooltip";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { scoreLabel } from "@/types/discovery";
import type { AiTakeState, Repo } from "@/types/discovery";

interface RepoCardProps {
  repo: Repo;
  index: number;
  aiState?: AiTakeState;
  onGetAiTake: (repo: Repo, isRetry?: boolean) => void;
  onOpen: (repo: Repo) => void;
  isSaved: boolean;
  onToggleSaved: (repoId: number) => void;
}

function scoreTier(score: number): "good" | "mid" | "low" {
  if (score >= 70) return "good";
  if (score >= 45) return "mid";
  return "low";
}

export function RepoCard({ repo, index, aiState, onGetAiTake, onOpen, isSaved, onToggleSaved }: RepoCardProps) {
  const status = aiState?.status ?? "idle";
  const tier = scoreTier(repo.reliabilityScore);
  const label = scoreLabel(repo.reliabilityScore);

  return (
    <div className="fade-card" style={{ animationDelay: `${(index % 6) * 60}ms` }}>
      <Card className="repo-card">
        <CardContent className="repo-card-body">
          <button type="button" className="repo-open-trigger" onClick={() => onOpen(repo)}>
            <div className="repo-top-row">
              {repo.ownerAvatar ? (
                <img src={repo.ownerAvatar} alt="" className="repo-avatar" loading="lazy" />
              ) : (
                <div className="repo-avatar-fallback"><FolderGit2 size={14} strokeWidth={1.75} aria-hidden="true" /></div>
              )}
              <div className="repo-name-block">
                <span className="repo-owner">{repo.owner}</span>
                <span className="repo-name">{repo.name}</span>
              </div>
              <div className="repo-badges-inline">
                {repo.archived && <Badge variant="outline" className="archived-badge">Archived</Badge>}
                <Tooltip
                  content={
                    <>
                      <div className="score-tooltip-head">Reliability — {repo.reliabilityScore}/100 &middot; {label}</div>
                      <ScoreBreakdown factors={reliabilityScoreFactors(repo)} archived={repo.archived} />
                    </>
                  }
                >
                  <span className={`health-badge ${tier}`} tabIndex={0}>{repo.reliabilityScore}</span>
                </Tooltip>
              </div>
            </div>
            <p className="repo-desc">{repo.description || "No description provided."}</p>
            {repo.frameworks.length > 0 && (
              <div className="repo-fw-row">
                {repo.frameworks.map((fw) => <span key={fw} className="fw-chip">{fw}</span>)}
              </div>
            )}
            <div className="repo-topics">
              {repo.topics.slice(0, 3).map((t) => <span key={t} className="topic-chip">{t}</span>)}
            </div>
          </button>

          <button
            type="button"
            className={`save-btn ${isSaved ? "saved" : ""}`}
            onClick={() => onToggleSaved(repo.id)}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved" : "Save repository"}
            style={{ position: "absolute", top: 14, right: 14 }}
          >
            <Bookmark size={15} strokeWidth={2} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
          </button>

          <div className="repo-stat-row">
            <span className="repo-stat"><Star size={12} strokeWidth={2} aria-hidden="true" />{formatCount(repo.stars)}</span>
            <span className="repo-stat"><GitFork size={12} strokeWidth={2} aria-hidden="true" />{formatCount(repo.forks)}</span>
            <span className="repo-stat"><Clock size={12} strokeWidth={2} aria-hidden="true" />{timeAgo(repo.updatedAt)}</span>
            {repo.language && (
              <span className="repo-stat">
                <span className="lang-dot" style={{ backgroundColor: languageColor(repo.language) }} />
                {repo.language}
              </span>
            )}
          </div>

          <div className="repo-ai-zone">
            {status === "idle" && (
              <Button type="button" variant="ghost" className="ai-trigger" onClick={() => onGetAiTake(repo)}>
                <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
                How do I use this?
              </Button>
            )}
            {status === "loading" && (
              <div className="ai-loading">
                <span className="pulse-dots"><span className="pdot" /><span className="pdot" style={{ animationDelay: ".2s" }} /><span className="pdot" style={{ animationDelay: ".4s" }} /></span>
                <span className="ai-loading-text">Reading the docs…</span>
              </div>
            )}
            {status === "error" && (
              <button type="button" className="ai-error" onClick={() => onGetAiTake(repo, true)}>
                <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />Couldn&apos;t reach the AI — retry
              </button>
            )}
            {status === "done" && aiState?.insights && (
              <div className="ai-result">
                <div className="ai-result-label"><Sparkles size={11} strokeWidth={2} aria-hidden="true" />What it does</div>
                <div className="ai-result-row"><AiReveal text={aiState.insights.whatItDoes} /></div>
                <div className="ai-result-row">
                  <b>How to use it:</b> {aiState.insights.howToUse}
                </div>
                {aiState.insights.goodFor && (
                  <div className="ai-result-row">
                    <span className="ai-diff-badge">Good for: {aiState.insights.goodFor}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
