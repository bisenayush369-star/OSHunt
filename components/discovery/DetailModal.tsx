"use client";

import { useEffect, useRef } from "react";
import {
  Activity, CircleDot, ExternalLink, Eye, FileText, GitCommitHorizontal,
  GitFork, Scale, Star, Tag, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchRepoDetail } from "@/lib/discovery/github";
import { refineReliabilityScore, reliabilityScoreFactors } from "@/lib/discovery/ranking";
import { languageColor } from "@/lib/discovery/colors";
import { formatCount, timeAgo, activityLabel } from "@/lib/discovery/utils";
import { Skeleton } from "./Skeleton";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { Tooltip } from "./Tooltip";
import { useAsync } from "@/hooks/useGithub";
import { scoreLabel } from "@/types/discovery";
import type { Repo } from "@/types/discovery";

interface DetailModalProps {
  repo: Repo;
  onClose: () => void;
}

function scoreTier(score: number): "good" | "mid" | "low" {
  if (score >= 70) return "good";
  if (score >= 45) return "mid";
  return "low";
}

export function DetailModal({ repo, onClose }: DetailModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data: detail, status } = useAsync(() => fetchRepoDetail(repo.owner, repo.name), [repo.owner, repo.name]);

  const refined = status === "loaded" && detail ? refineReliabilityScore(repo, detail) : null;
  const displayScore = refined ? refined.score : repo.reliabilityScore;
  const displayFactors = refined ? refined.factors : reliabilityScoreFactors(repo);
  const tier = scoreTier(displayScore);
  const label = scoreLabel(displayScore);

  const allFrameworks = Array.from(new Set([...repo.frameworks, ...(detail?.packageJsonFrameworks ?? [])]));

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="modal-head">
          {repo.ownerAvatar && <img src={repo.ownerAvatar} alt="" className="modal-avatar" />}
          <div>
            <h2 id="modal-title" className="modal-title">{repo.fullName}</h2>
            <p className="modal-desc">{repo.description || "No description provided."}</p>
          </div>
        </div>

        <Tooltip
          content={<ScoreBreakdown factors={displayFactors} archived={repo.archived} />}
        >
          <div className={`reliability-score-block ${tier}`} tabIndex={0}>
            <span className="cs-title">Reliability Score</span>
            <span className="cs-value">{displayScore} <span className="cs-max">/ 100</span></span>
            <span className="cs-label">{label}</span>
            {!refined && <span className="cs-refining">refining once details load…</span>}
          </div>
        </Tooltip>

        <div className="modal-stats">
          <span><Star size={13} strokeWidth={2} aria-hidden="true" />{formatCount(repo.stars)} stars</span>
          <span><GitFork size={13} strokeWidth={2} aria-hidden="true" />{formatCount(repo.forks)} forks</span>
          <span><Eye size={13} strokeWidth={2} aria-hidden="true" />{formatCount(repo.watchers)} watching</span>
          <span><CircleDot size={13} strokeWidth={2} aria-hidden="true" />{formatCount(repo.openIssues)} open issues</span>
          {repo.license && <span><Scale size={13} strokeWidth={2} aria-hidden="true" />{repo.license}</span>}
        </div>

        {repo.topics.length > 0 && (
          <div className="modal-topics">
            {repo.topics.map((t) => <span key={t} className="topic-chip">{t}</span>)}
          </div>
        )}

        {allFrameworks.length > 0 && (
          <div className="repo-fw-row" style={{ marginBottom: 18 }}>
            {allFrameworks.map((fw) => <span key={fw} className="fw-chip">{fw}</span>)}
          </div>
        )}

        {repo.homepage && (
          <div className="gfi-banner" style={{ marginBottom: 18 }}>
            <span>This project has its own site with docs and setup instructions</span>
            <a href={repo.homepage} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
              Visit it →
            </a>
          </div>
        )}

        <div className="modal-section">
          <div className="modal-section-label"><Activity size={12} strokeWidth={2} aria-hidden="true" />Repository Health</div>
          <div className="health-grid">
            <div className="health-row">
              <span>Last updated</span>
              <span>{repo.updatedAt ? timeAgo(repo.updatedAt) : "Unavailable"}</span>
            </div>
            <div className="health-row">
              <span>Latest release</span>
              {status !== "loaded" ? <Skeleton w={60} h={12} /> : (
                <span>{detail?.latestRelease ? (detail.latestRelease.name || detail.latestRelease.tagName) : "Unavailable"}</span>
              )}
            </div>
            <div className="health-row">
              <span>Contributors</span>
              {status !== "loaded" ? <Skeleton w={40} h={12} /> : (
                <span>{detail && detail.contributors.length > 0 ? `${detail.contributors.length}${detail.contributors.length === 6 ? "+" : ""}` : "Unavailable"}</span>
              )}
            </div>
            <div className="health-row">
              <span>Documentation</span>
              {status !== "loaded" ? <Skeleton w={40} h={12} /> : (
                <span>{detail?.readmeExcerpt ? "Available" : "Unavailable"}</span>
              )}
            </div>
            <div className="health-row">
              <span>License</span>
              <span>{repo.license || "Unavailable"}</span>
            </div>
            <div className="health-row">
              <span>Activity</span>
              <span>{activityLabel(repo.updatedAt)}</span>
            </div>
            <div className="health-row">
              <span>Status</span>
              <span>{repo.archived ? "Archived" : "Active"}</span>
            </div>
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-section-label"><FileText size={12} strokeWidth={2} aria-hidden="true" />README</div>
          {status === "error" ? (
            <p className="modal-muted">Couldn&apos;t load README right now.</p>
          ) : status !== "loaded" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton w="100%" h={12} /><Skeleton w="94%" h={12} /><Skeleton w="70%" h={12} />
            </div>
          ) : detail?.readmeExcerpt ? (
            <p className="modal-readme">{detail.readmeExcerpt}</p>
          ) : (
            <p className="modal-muted">No README found.</p>
          )}
        </div>

        <div className="modal-section">
          <div className="modal-section-label"><FileText size={12} strokeWidth={2} aria-hidden="true" />Quick overview</div>
          <p className="modal-muted">
            {repo.description || "This repository is shown because it matches the current discovery category."}
          </p>
          <p className="modal-muted" style={{ marginTop: 6 }}>
            {repo.language ? `Primary language: ${repo.language}.` : "Primary language: not listed."}
            {repo.topics.length > 0 ? ` Topics include ${repo.topics.slice(0, 3).join(", ")}.` : ""}
          </p>
        </div>

        {detail && detail.languages.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-label">Languages</div>
            <div className="lang-bar">
              {detail.languages.map((l) => (
                <div key={l.language} style={{ width: `${l.percent}%`, backgroundColor: languageColor(l.language) }} title={`${l.language} ${l.percent}%`} />
              ))}
            </div>
            <div className="lang-legend">
              {detail.languages.map((l) => (
                <span key={l.language} className="lang-legend-item">
                  <span className="lang-dot" style={{ backgroundColor: languageColor(l.language) }} />{l.language} {l.percent}%
                </span>
              ))}
            </div>
          </div>
        )}

        {detail?.latestRelease && (
          <div className="modal-section">
            <div className="modal-section-label"><Tag size={12} strokeWidth={2} aria-hidden="true" />Latest release</div>
            <div className="release-row">
              <a href={detail.latestRelease.htmlUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--t1)", fontWeight: 600 }}>
                {detail.latestRelease.name || detail.latestRelease.tagName}
              </a>
              {detail.latestRelease.publishedAt && <span>{timeAgo(detail.latestRelease.publishedAt)}</span>}
            </div>
          </div>
        )}

        {detail && detail.recentCommits.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-label"><GitCommitHorizontal size={12} strokeWidth={2} aria-hidden="true" />Recent commits</div>
            {detail.recentCommits.map((c) => (
              <div key={c.sha} className="commit-row">
                <span className="commit-sha">{c.sha}</span>
                <span className="commit-msg">{c.message}</span>
              </div>
            ))}
          </div>
        )}

        {detail && detail.contributors.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-label"><Users size={12} strokeWidth={2} aria-hidden="true" />Top contributors</div>
            <div className="contributor-row">
              {detail.contributors.map((c) => (
                <a key={c.login} href={c.htmlUrl} target="_blank" rel="noopener noreferrer" className="contributor" title={`${c.login} — ${c.contributions} commits`}>
                  <img src={c.avatarUrl ?? "/favicon.png"} alt={c.login} loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button asChild className="btn-shine">
            <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
              View on GitHub <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
            </a>
          </Button>
          {repo.homepage && (
            <Button asChild variant="outline">
              <a href={repo.homepage} target="_blank" rel="noopener noreferrer">Visit site</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
