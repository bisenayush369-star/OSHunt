"use client";

import Image from "next/image";
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
  const tier = scoreTier(Number.isFinite(repo.reliabilityScore) ? repo.reliabilityScore : 0);
  const label = scoreLabel(Number.isFinite(repo.reliabilityScore) ? repo.reliabilityScore : 0);
  const frameworks = Array.isArray(repo.frameworks) ? repo.frameworks : [];
  const topics = Array.isArray(repo.topics) ? repo.topics : [];
  const ownerValue = typeof repo.owner === "string" ? repo.owner : typeof repo.owner === "object" && repo.owner && "login" in repo.owner && typeof (repo.owner as { login?: unknown }).login === "string" ? (repo.owner as { login: string }).login : "unknown";
  const ownerAvatarValue = typeof repo.ownerAvatar === "string"
    ? repo.ownerAvatar
    : typeof repo.owner === "object" && repo.owner && "avatar_url" in repo.owner && typeof (repo.owner as { avatar_url?: unknown }).avatar_url === "string"
      ? (repo.owner as { avatar_url: string }).avatar_url
      : null;
  const owner = ownerValue;
  const ownerAvatar = ownerAvatarValue;
  const repoName = repo.name ?? repo.fullName?.split("/").at(-1) ?? "Repository";

  return (
    <div className="fade-card" style={{ animationDelay: `${(index % 6) * 60}ms` }}>
      <Card className="repo-card square-card">
        <CardContent className="repo-card-body square-card-body">
          <button type="button" className="repo-open-trigger" onClick={() => onOpen(repo)}>
            <div className="repo-top-row">
              {ownerAvatar ? (
                <Image src={ownerAvatar} alt="" width={26} height={26} className="repo-avatar" loading="lazy" />
              ) : (
                <div className="repo-avatar-fallback"><FolderGit2 size={14} strokeWidth={1.75} aria-hidden="true" /></div>
              )}
              <div className="repo-name-block">
                <span className="repo-owner">{owner}</span>
                <span className="repo-name">{repoName}</span>
              </div>
              <div className="repo-badges-inline">
                {repo.archived && <Badge variant="outline" className="archived-badge">Archived</Badge>}
              </div>
            </div>
            <p className="repo-desc">{repo.description || "No description provided."}</p>
            {frameworks.length > 0 && (
              <div className="repo-fw-row">
                {frameworks.map((fw) => <span key={fw} className="fw-chip">{fw}</span>)}
              </div>
            )}
            <div className="repo-topics">
              {topics.slice(0, 3).map((t) => <span key={t} className="topic-chip">{t}</span>)}
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

          <div className="repo-meta-row">
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
          </div>

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
