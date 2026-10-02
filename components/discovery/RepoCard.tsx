"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Clock, GitFork, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FolderGit2 } from "lucide-react";
import { languageColor } from "@/components/lib/discovery/colors";
import { formatCount, timeAgo } from "@/components/lib/discovery/utils";
import { reliabilityScoreFactors } from "@/components/lib/discovery/ranking";
import { Tooltip } from "./Tooltip";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { scoreLabel } from "@/components/types/discovery";
import type { AiTakeState, Repo } from "@/components/types/discovery";
import { CopyButton } from "@/components/repo/CopyButton";
import { RepoQnA } from "@/components/repo/RepoQnA";
import type { GithubRepo } from "@/components/lib/github";

interface RepoCardProps {
  repo: Repo;
  index: number;
  aiState?: AiTakeState;
  onGetAiTake: (repo: Repo, isRetry?: boolean) => void;
  onOpen: (repo: Repo) => void;
  isSaved: boolean;
  onToggleSaved: (repo: Repo) => void;
}

function scoreTier(score: number): "good" | "mid" | "low" {
  if (score >= 70) return "good";
  if (score >= 45) return "mid";
  return "low";
}

export function RepoCard({ repo, index, onOpen, isSaved, onToggleSaved }: RepoCardProps) {
  const tier = scoreTier(repo.reliabilityScore);
  const label = scoreLabel(repo.reliabilityScore);

  return (
    <div className="fade-card" style={{ animationDelay: `${(index % 6) * 60}ms` }}>
      <Card className="repo-card square-card">
        <CardContent className="repo-card-body square-card-body">
          <button type="button" className="repo-open-trigger" onClick={() => onOpen(repo)}>
            <div className="repo-top-row">
              {repo.ownerAvatar ? (
                <Image src={repo.ownerAvatar} alt="" width={26} height={26} className="repo-avatar" loading="lazy" />
              ) : (
                <div className="repo-avatar-fallback"><FolderGit2 size={14} strokeWidth={1.75} aria-hidden="true" /></div>
              )}
              <div className="repo-name-block">
                <span className="repo-owner">{repo.owner}</span>
                <span className="repo-name">{repo.name}</span>
              </div>
              <div className="repo-badges-inline">
                {repo.archived && <Badge variant="outline" className="archived-badge">Archived</Badge>}
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
            onClick={() => onToggleSaved(repo)}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved" : "Save repository"}
            style={{ position: "absolute", top: 12, right: 12 }}
          >
            <Bookmark size={20} strokeWidth={2} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
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

          <Tooltip
            content={
              <>
                <div className="score-tooltip-head">Reliability — {repo.reliabilityScore}/100 &middot; {label}</div>
                <ScoreBreakdown factors={reliabilityScoreFactors(repo)} archived={repo.archived} />
              </>
            }
          >
            <span className={`health-badge ${tier} repo-score`} tabIndex={0}>{repo.reliabilityScore}</span>
          </Tooltip>

          <div className="repo-ai-zone square-action-row">
            <CopyButton cloneCommand={`git clone ${repo.htmlUrl}.git`} url={repo.htmlUrl} />
            <RepoQnA repo={((): GithubRepo => ({
              ...repo,
              fullName: repo.fullName,
              owner: { login: repo.owner, avatar_url: repo.ownerAvatar ?? undefined },
              name: repo.name,
              stars: repo.stars,
              forks: repo.forks,
              language: repo.language ?? undefined,
              topics: repo.topics,
              description: repo.description ?? undefined,
              htmlUrl: repo.htmlUrl,
              createdAt: repo.createdAt ?? undefined,
            }))()} />

            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#a8ff3e] px-3 text-sm font-medium text-[#090909] transition-colors hover:bg-[#bdff6b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
                <path d="M12 4v8m0 0l3-3m-3 3l-3-3M5 17h14" />
              </svg>
              View
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
