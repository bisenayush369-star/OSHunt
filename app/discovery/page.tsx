"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  TrendingUp,
  BrainCircuit,
  Code2,
  Server,
  Boxes,
  Terminal,
  ShieldCheck,
  HardDrive,
  Search,
  X,
  Star,
  GitFork,
  Eye,
  CircleDot,
  ExternalLink,
  Sparkles,
  Users,
  FileText,
  Scale,
  Clock,
  AlertTriangle,
  RotateCcw,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dropping this into the real Next.js project:
 *  1) restore `import Navbar from "@/components/ui/Navbar";` and render <Navbar />.
 *  2) this preview calls api.github.com DIRECTLY from the browser (GitHub's
 *     API sends permissive CORS headers, so it genuinely works) so you can
 *     see live data right now. That's fine for a demo, but GitHub's
 *     unauthenticated limit is 10 searches/minute and 60 requests/hour per
 *     IP — trivial to exhaust with real traffic. In your app, point
 *     CATEGORY_ENDPOINT / DETAIL_ENDPOINT at your own /api/gems routes
 *     (delivered alongside this file) instead — those run server-side with
 *     an optional GITHUB_TOKEN, which raises the limit to 5,000/hour.
 *  3) fetchAiTake() still calls the Claude API directly for this preview,
 *     same caveat as last time — swap for your own backend route in prod.
 *
 * Everything you see in the grid is real: real stars, real descriptions,
 * real topics, fetched from GitHub's search API. No SEED_GEMS import
 * anywhere in this file.
 */

const USE_OWN_BACKEND = false; // flip true once your /api/gems routes are live
const CATEGORY_ENDPOINT = "/api/gems";
const DETAIL_ENDPOINT = "/api/gems";

const CATEGORIES = [
  { id: "trending", label: "Trending", Icon: TrendingUp, query: "stars:>1000 pushed:>{recent}", sort: "stars" },
  { id: "ai-ml", label: "AI & ML", Icon: BrainCircuit, query: "topic:machine-learning stars:>500", sort: "stars" },
  { id: "frontend", label: "Frontend", Icon: Code2, query: "topic:frontend stars:>500", sort: "stars" },
  { id: "backend", label: "Backend", Icon: Server, query: "topic:backend stars:>500", sort: "stars" },
  { id: "devops", label: "DevOps", Icon: Boxes, query: "topic:devops stars:>500", sort: "stars" },
  { id: "cli", label: "CLI Tools", Icon: Terminal, query: "topic:cli stars:>300", sort: "stars" },
  { id: "security", label: "Security", Icon: ShieldCheck, query: "topic:security stars:>500", sort: "stars" },
  { id: "self-hosted", label: "Self-Hosted", Icon: HardDrive, query: "topic:selfhosted stars:>500", sort: "stars" },
];

const LANG_COLORS = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d", C: "#555555", "C#": "#178600",
  PHP: "#4F5D95", Ruby: "#701516", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB",
  Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", Vue: "#41b883", Svelte: "#ff3e00",
  Zig: "#ec915c", Elixir: "#6e4a7e", Scala: "#c22d40", Lua: "#000080",
};
function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 58%)`;
}
function languageColor(lang) {
  if (!lang) return "#666";
  return LANG_COLORS[lang] || hashColor(lang);
}

function formatCount(n) {
  if (n == null) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(dateStr) {
  if (!dateStr) return "unknown";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function recentDateISO(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function normalizeRepo(raw) {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    owner: raw.owner?.login,
    ownerAvatar: raw.owner?.avatar_url,
    description: raw.description || null,
    homepage: raw.homepage || null,
    language: raw.language,
    topics: raw.topics || [],
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssues: raw.open_issues_count,
    watchers: raw.watchers_count,
    license: raw.license?.spdx_id && raw.license.spdx_id !== "NOASSERTION" ? raw.license.spdx_id : raw.license?.name || null,
    updatedAt: raw.pushed_at || raw.updated_at,
    htmlUrl: raw.html_url,
    archived: Boolean(raw.archived),
  };
}

class GithubRateLimitError extends Error {
  constructor(resetInSeconds) {
    super("GitHub API rate limit reached");
    this.name = "GithubRateLimitError";
    this.resetInSeconds = resetInSeconds;
  }
}

async function githubFetch(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const resetInSeconds = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : null;
    throw new GithubRateLimitError(resetInSeconds);
  }
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res.json();
}

const categoryCache = new Map();
const detailCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchCategoryRepos(category) {
  const cached = categoryCache.get(category.id);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  if (USE_OWN_BACKEND) {
    const json = await githubFetch(`${CATEGORY_ENDPOINT}?category=${category.id}`);
    categoryCache.set(category.id, { data: json.items, at: Date.now() });
    return json.items;
  }

  const q = category.query.replace("{recent}", recentDateISO(30));
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${category.sort}&order=desc&per_page=12`;
  const json = await githubFetch(url);
  const items = (json.items || []).map(normalizeRepo);
  categoryCache.set(category.id, { data: items, at: Date.now() });
  return items;
}

function decodeBase64Utf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function markdownExcerpt(md, maxLen = 320) {
  const stripped = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>]/g, "")
    .replace(/\r?\n{2,}/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
  return stripped.length > maxLen ? `${stripped.slice(0, maxLen).trim()}…` : stripped;
}

function languagePercentages(bytesByLanguage) {
  const total = Object.values(bytesByLanguage).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(bytesByLanguage)
    .map(([language, bytes]) => ({ language, percent: Math.round((bytes / total) * 1000) / 10 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);
}

async function fetchRepoDetail(owner, name) {
  const key = `${owner}/${name}`;
  if (detailCache.has(key)) return detailCache.get(key);

  if (USE_OWN_BACKEND) {
    const json = await githubFetch(`${DETAIL_ENDPOINT}/${owner}/${name}`);
    detailCache.set(key, json);
    return json;
  }

  const [languages, contributors, readme] = await Promise.allSettled([
    githubFetch(`https://api.github.com/repos/${owner}/${name}/languages`),
    githubFetch(`https://api.github.com/repos/${owner}/${name}/contributors?per_page=6`),
    githubFetch(`https://api.github.com/repos/${owner}/${name}/readme`),
  ]);

  const result = {
    languages: languages.status === "fulfilled" ? languagePercentages(languages.value) : [],
    contributors:
      contributors.status === "fulfilled"
        ? contributors.value.map((c) => ({ login: c.login, avatarUrl: c.avatar_url, htmlUrl: c.html_url, contributions: c.contributions }))
        : [],
    readmeExcerpt:
      readme.status === "fulfilled" && readme.value?.content
        ? markdownExcerpt(decodeBase64Utf8(readme.value.content))
        : null,
  };
  detailCache.set(key, result);
  return result;
}

async function fetchAiTake(repo) {
  const prompt = `In one to two punchy sentences (under 40 words total), explain why the GitHub repo "${repo.fullName}" is worth a developer's time. Description: "${repo.description || "no description provided"}". Primary language: ${repo.language || "unspecified"}. Topics: ${(repo.topics || []).slice(0, 5).join(", ") || "none listed"}. Stars: ${repo.stars}. Confident, concise, dev-tool voice. Plain text only — no markdown, no preamble, no quotation marks.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const text = Array.isArray(data?.content)
    ? data.content.filter((b) => b?.type === "text").map((b) => b.text).join(" ").trim()
    : "";
  if (!text) throw new Error("Empty response");
  return text;
}

function Skeleton({ w, h }) {
  return <div className="skel" style={{ width: w, height: h }} />;
}

function AiReveal({ text }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    if (!text) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(text);
      return undefined;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 14);
    return () => clearInterval(id);
  }, [text]);
  const done = shown.length >= text.length;
  return (
    <span aria-live="polite" aria-busy={!done}>
      {shown}
      {!done && <span className="reveal-cursor" />}
    </span>
  );
}

function RepoCard({ repo, index, aiEntry, onGetTake, onOpen }) {
  const status = aiEntry?.status || "idle";
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
              {repo.archived && <Badge variant="outline" className="archived-badge">Archived</Badge>}
            </div>
            <p className="repo-desc">{repo.description || "No description provided."}</p>
            <div className="repo-topics">
              {repo.topics.slice(0, 3).map((t) => (
                <span key={t} className="topic-chip">{t}</span>
              ))}
            </div>
          </button>

          <div className="repo-stat-row">
            <span className="repo-stat"><Star size={12} strokeWidth={2} aria-hidden="true" />{formatCount(repo.stars)}</span>
            <span className="repo-stat"><GitFork size={12} strokeWidth={2} aria-hidden="true" />{formatCount(repo.forks)}</span>
            <span className="repo-stat"><Clock size={12} strokeWidth={2} aria-hidden="true" />{timeAgo(repo.updatedAt)}</span>
            {repo.language && (
              <span className="repo-stat lang-stat">
                <span className="lang-dot" style={{ backgroundColor: languageColor(repo.language) }} />
                {repo.language}
              </span>
            )}
          </div>

          <div className="repo-ai-zone">
            {status === "idle" && (
              <Button type="button" variant="ghost" className="ai-trigger" onClick={() => onGetTake(repo)}>
                <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
                Get AI take
              </Button>
            )}
            {status === "loading" && (
              <div className="ai-loading">
                <span className="pulse-dots"><span className="pdot" /><span className="pdot" style={{ animationDelay: ".2s" }} /><span className="pdot" style={{ animationDelay: ".4s" }} /></span>
                <span className="ai-loading-text">Reading the repo…</span>
              </div>
            )}
            {status === "error" && (
              <button type="button" className="ai-error" onClick={() => onGetTake(repo, true)}>
                <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />Couldn&apos;t reach the AI — retry
              </button>
            )}
            {status === "done" && (
              <div className="ai-result">
                <div className="ai-result-label"><Sparkles size={11} strokeWidth={2} aria-hidden="true" />AI take</div>
                <p className="ai-result-text"><AiReveal text={aiEntry.text} /></p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailModal({ repo, onClose }) {
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setDetailError(false);
    fetchRepoDetail(repo.owner, repo.name)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) setDetailError(true); });
    return () => { cancelled = true; };
  }, [repo.owner, repo.name]);

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

        <div className="modal-section">
          <div className="modal-section-label"><FileText size={12} strokeWidth={2} aria-hidden="true" />README</div>
          {detailError ? (
            <p className="modal-muted">Couldn&apos;t load README right now.</p>
          ) : detail === null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton w="100%" h={12} /><Skeleton w="94%" h={12} /><Skeleton w="70%" h={12} />
            </div>
          ) : detail.readmeExcerpt ? (
            <p className="modal-readme">{detail.readmeExcerpt}</p>
          ) : (
            <p className="modal-muted">No README found.</p>
          )}
        </div>

        {detail?.languages?.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-label"><Code2 size={12} strokeWidth={2} aria-hidden="true" />Languages</div>
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

        {detail?.contributors?.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-label"><Users size={12} strokeWidth={2} aria-hidden="true" />Top contributors</div>
            <div className="contributor-row">
              {detail.contributors.map((c) => (
                <a key={c.login} href={c.htmlUrl} target="_blank" rel="noopener noreferrer" className="contributor" title={`${c.login} — ${c.contributions} commits`}>
                  <img src={c.avatarUrl} alt={c.login} loading="lazy" />
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

export default function GemsPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [aiState, setAiState] = useState({});
  const [openRepo, setOpenRepo] = useState(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const loadCategory = useCallback((category) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    fetchCategoryRepos(category)
      .then((data) => {
        if (seq !== requestSeq.current) return;
        setRepos(data);
        setLoading(false);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        setError(err instanceof GithubRateLimitError ? { type: "rate-limit", resetInSeconds: err.resetInSeconds } : { type: "generic" });
        setLoading(false);
      });
  }, []);

  useEffect(() => { loadCategory(activeCategory); }, [activeCategory, loadCategory]);

  const handleGetTake = async (repo, isRetry = false) => {
    const current = aiState[repo.id];
    if (!isRetry && (current?.status === "loading" || current?.status === "done")) return;
    setAiState((prev) => ({ ...prev, [repo.id]: { status: "loading" } }));
    try {
      const text = await fetchAiTake(repo);
      setAiState((prev) => ({ ...prev, [repo.id]: { status: "done", text } }));
    } catch {
      setAiState((prev) => ({ ...prev, [repo.id]: { status: "error" } }));
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? repos.filter((r) => {
        const haystack = [r.name, r.owner, r.description, r.language, ...(r.topics || [])].join(" ").toLowerCase();
        return haystack.includes(q);
      })
    : repos;

  return (
    <div className="gems-page">
      <style>{`
        .gems-page {
          --bg: #090909; --surface: #0a0a0a; --border: #141414; --border-2: #1a1a1a;
          --accent: #a8ff3e; --accent-2: #7fe62c; --error: #ff4d6d;
          --t0: #fff; --t1: #e0e0e0; --t2: #ccc; --t3: #999; --t4: #888; --t5: #777; --t6: #666; --t7: #555;
          --font: 'Outfit','Inter',sans-serif; --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          background: var(--bg); color: var(--t1); font-family: var(--font);
          -webkit-font-smoothing: antialiased; min-height: 100vh;
        }
        .gems-page *, .gems-page *::before, .gems-page *::after { box-sizing: border-box; }
        .gems-page a { color: inherit; text-decoration: none; }
        .gems-page button, .gems-page input { font-family: inherit; }
        .gems-page :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

        @keyframes fade-up { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
        @keyframes shimmer { 0%{transform:translateX(-100%);} 100%{transform:translateX(100%);} }
        @keyframes blink { 50%{opacity:0;} }
        @keyframes pulse-dot { 0%,100%{opacity:.3;} 50%{opacity:1;} }
        @media (prefers-reduced-motion: reduce) {
          *,*::before,*::after{ animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
        }

        .container { max-width: 1100px; margin: 0 auto; padding: clamp(64px,10vw,88px) clamp(16px,4vw,32px) clamp(64px,8vw,88px); }
        .eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:12px; opacity:0; animation:fade-up .6s ease both; }
        .eyebrow-label { font-size:11px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--accent); }
        .h1 { opacity:0; animation:fade-up .6s ease both; animation-delay:80ms; font-size:clamp(28px,4vw,40px); font-weight:800; letter-spacing:-.03em; color:var(--t0); margin-bottom:10px; }
        .h1 .grad { background:linear-gradient(90deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .subhead { opacity:0; animation:fade-up .6s ease both; animation-delay:160ms; max-width:560px; font-size:14.5px; font-weight:300; line-height:1.7; color:var(--t4); margin-bottom:28px; }

        .toolbar { display:flex; flex-direction:column; gap:14px; margin-bottom:28px; }
        .category-row { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
        .category-row::-webkit-scrollbar { display:none; }
        .cat-pill { flex-shrink:0; display:inline-flex; align-items:center; gap:7px; height:auto !important; padding:8px 15px !important; border-radius:999px !important; font-size:12.5px !important; font-weight:500; transition:all .2s ease; }
        .cat-pill.inactive { background:transparent !important; border-color:var(--border-2) !important; color:var(--t4) !important; }
        .cat-pill.inactive:hover { border-color:rgba(168,255,62,.35) !important; color:var(--accent) !important; }
        .cat-pill.active { background:rgba(168,255,62,.08) !important; border-color:rgba(168,255,62,.4) !important; color:var(--accent) !important; }

        .search-wrap { position:relative; max-width:340px; }
        .search-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--t7); pointer-events:none; }
        .search-input { width:100%; background:rgba(255,255,255,.03); border:1px solid var(--border-2); border-radius:10px; padding:9px 14px 9px 36px; font-size:13px; color:var(--t1); }
        .search-input::placeholder { color:var(--t7); }
        .search-input:focus { outline:none; border-color:rgba(168,255,62,.35); box-shadow:0 0 0 3px rgba(168,255,62,.08); }

        .rate-banner { display:flex; align-items:flex-start; gap:12px; background:rgba(255,77,109,.06); border:1px solid rgba(255,77,109,.25); border-radius:12px; padding:16px 18px; margin-bottom:24px; }
        .rate-banner svg { color:var(--error); flex-shrink:0; margin-top:2px; }
        .rate-banner p { font-size:13px; color:var(--t2); line-height:1.6; margin:0 0 4px; }
        .rate-banner .sub { color:var(--t5); font-size:12px; }

        .grid { display:grid; grid-template-columns:1fr; gap:14px; }
        @media (min-width:640px) { .grid { grid-template-columns:1fr 1fr; } }
        @media (min-width:1024px) { .grid { grid-template-columns:1fr 1fr 1fr; } }

        .fade-card { animation: card-fade-up .55s cubic-bezier(.16,1,.3,1) both; }
        @keyframes card-fade-up { from { opacity:0; transform:translateY(20px);} to { opacity:1; transform:translateY(0);} }
        @media (prefers-reduced-motion: reduce) { .fade-card { animation:none; } }

        .repo-card { background:var(--surface) !important; border:1px solid var(--border) !important; border-radius:16px !important; transition:border-color .25s ease, transform .25s ease, background-color .25s ease; height:100%; }
        .repo-card:hover { border-color:var(--border-2) !important; transform:translateY(-3px); background:#0d0d0d !important; }
        .repo-card-body { padding:18px !important; display:flex; flex-direction:column; height:100%; }
        .repo-open-trigger { all:unset; cursor:pointer; display:block; box-sizing:border-box; width:100%; }
        .repo-top-row { display:flex; align-items:center; gap:9px; margin-bottom:11px; }
        .repo-avatar, .repo-avatar-fallback { width:26px; height:26px; border-radius:7px; flex-shrink:0; object-fit:cover; border:1px solid var(--border-2); }
        .repo-avatar-fallback { display:flex; align-items:center; justify-content:center; background:#111; color:var(--t6); }
        .repo-name-block { display:flex; flex-direction:column; min-width:0; }
        .repo-owner { font-size:10.5px; color:var(--t6); font-family:var(--font-mono); }
        .repo-name { font-size:14px; font-weight:700; color:var(--t0); font-family:var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .archived-badge { margin-left:auto; font-size:9.5px !important; padding:1px 7px !important; color:var(--t6) !important; border-color:var(--border-2) !important; background:transparent !important; flex-shrink:0; }
        .repo-desc { font-size:12.5px; line-height:1.6; color:var(--t3); margin:0 0 10px; text-align:left; }
        .repo-topics { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:12px; }
        .topic-chip { font-size:10px; padding:2px 8px; border-radius:999px; background:rgba(168,255,62,.06); border:1px solid rgba(168,255,62,.16); color:var(--accent); }
        .repo-stat-row { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding-top:12px; border-top:1px solid var(--border); font-size:11px; color:var(--t5); margin-bottom:12px; }
        .repo-stat { display:flex; align-items:center; gap:4px; }
        .lang-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .repo-ai-zone { margin-top:auto; padding-top:2px; }

        .ai-trigger { padding:0 !important; height:auto !important; justify-content:flex-start !important; gap:7px !important; color:var(--t5) !important; font-size:12px !important; font-weight:500; }
        .ai-trigger:hover { color:var(--accent) !important; background:transparent !important; }
        .ai-trigger svg { color:var(--accent); }
        .ai-loading { display:flex; align-items:center; gap:9px; }
        .pulse-dots { display:flex; gap:4px; }
        .pdot { width:5px; height:5px; border-radius:50%; background:var(--accent); animation:pulse-dot 1.4s ease-in-out infinite; }
        .ai-loading-text { font-size:11.5px; font-style:italic; color:var(--t6); }
        .ai-error { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:11.5px; color:var(--error); }
        .ai-error:hover { text-decoration:underline; }
        .ai-result { border-radius:10px; border:1px solid rgba(168,255,62,.14); background:linear-gradient(180deg,rgba(168,255,62,.05),transparent); padding:11px 12px; }
        .ai-result-label { display:flex; align-items:center; gap:6px; font-size:9.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); margin-bottom:5px; }
        .ai-result-text { font-size:12px; line-height:1.6; color:var(--t2); margin:0; }
        .reveal-cursor { display:inline-block; width:2px; height:11px; background:var(--accent); vertical-align:text-bottom; margin-left:2px; animation:blink 1s step-start infinite; }

        .skel { position:relative; overflow:hidden; border-radius:6px; background:#111; }
        .skel::after { content:""; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent); animation:shimmer 1.6s infinite; }

        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(4px); display:flex; align-items:flex-start; justify-content:center; padding:5vh 16px; z-index:100; overflow-y:auto; }
        .modal-panel { position:relative; width:100%; max-width:560px; background:var(--surface); border:1px solid var(--border-2); border-radius:18px; padding:26px 24px; margin-bottom:5vh; }
        .modal-close { all:unset; cursor:pointer; position:absolute; top:16px; right:16px; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--t5); background:rgba(255,255,255,.04); }
        .modal-close:hover { color:var(--t0); background:rgba(255,255,255,.08); }
        .modal-head { display:flex; gap:12px; margin-bottom:16px; padding-right:30px; }
        .modal-avatar { width:44px; height:44px; border-radius:10px; flex-shrink:0; border:1px solid var(--border-2); }
        .modal-title { font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--t0); margin:0 0 5px; word-break:break-word; }
        .modal-desc { font-size:13px; color:var(--t4); line-height:1.55; margin:0; }
        .modal-stats { display:flex; flex-wrap:wrap; gap:14px; padding:14px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-bottom:16px; }
        .modal-stats span { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--t4); }
        .modal-stats svg { color:var(--t6); }
        .modal-topics { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:18px; }
        .modal-section { margin-bottom:18px; }
        .modal-section-label { display:flex; align-items:center; gap:6px; font-size:10.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--t6); margin-bottom:9px; }
        .modal-readme, .modal-muted { font-size:12.5px; line-height:1.7; color:var(--t3); margin:0; }
        .modal-muted { color:var(--t7); font-style:italic; }
        .lang-bar { display:flex; height:8px; border-radius:4px; overflow:hidden; margin-bottom:8px; background:#111; }
        .lang-legend { display:flex; flex-wrap:wrap; gap:10px; }
        .lang-legend-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--t4); }
        .contributor-row { display:flex; gap:8px; flex-wrap:wrap; }
        .contributor img { width:32px; height:32px; border-radius:50%; border:1px solid var(--border-2); transition:transform .15s ease; }
        .contributor:hover img { transform:translateY(-2px); border-color:rgba(168,255,62,.4); }
        .modal-actions { display:flex; gap:10px; margin-top:22px; }
        .btn-shine { position:relative; overflow:hidden; }
        .btn-shine::after { content:""; position:absolute; top:0; left:-60%; width:40%; height:100%; transform:skewX(-20deg); background:linear-gradient(120deg,transparent,rgba(255,255,255,.35),transparent); transition:left .7s ease; }
        .btn-shine:hover::after { left:130%; }
      `}</style>

      <div className="container">
        <div className="eyebrow">
          <Sparkles size={14} strokeWidth={2} style={{ color: "var(--accent)" }} aria-hidden="true" />
          <span className="eyebrow-label">Live from GitHub</span>
        </div>
        <h1 className="h1">Discover open source,<br /><span className="grad">straight from the source.</span></h1>
        <p className="subhead">Every repo below is fetched live from the GitHub API — real stars, real activity, updated on every load. Nothing here is hardcoded.</p>

        <div className="toolbar">
          <div className="category-row">
            {CATEGORIES.map((c) => {
              const active = activeCategory.id === c.id;
              return (
                <Button
                  key={c.id}
                  type="button"
                  variant="outline"
                  className={`cat-pill ${active ? "active" : "inactive"}`}
                  onClick={() => setActiveCategory(c)}
                >
                  <c.Icon size={13} strokeWidth={2} aria-hidden="true" />
                  {c.label}
                </Button>
              );
            })}
          </div>
          <div className="search-wrap">
            <Search size={14} strokeWidth={2} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter loaded repos…"
              aria-label="Filter loaded repos"
              className="search-input"
            />
          </div>
        </div>

        {error?.type === "rate-limit" && (
          <div className="rate-banner">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <p>GitHub&apos;s public API limit was hit — 10 searches/minute, 60 requests/hour without a token.</p>
              <p className="sub">
                {error.resetInSeconds ? `Resets in about ${Math.ceil(error.resetInSeconds / 60)} min. ` : ""}
                In production, route this through your own /api/gems with a GITHUB_TOKEN to get 5,000/hour.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => loadCategory(activeCategory)}>
              <RotateCcw size={13} strokeWidth={2} aria-hidden="true" /> Retry
            </Button>
          </div>
        )}
        {error?.type === "generic" && (
          <div className="rate-banner">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <p style={{ flex: 1 }}>Couldn&apos;t reach the GitHub API just now.</p>
            <Button type="button" variant="outline" onClick={() => loadCategory(activeCategory)}>
              <RotateCcw size={13} strokeWidth={2} aria-hidden="true" /> Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="repo-card">
                <CardContent className="repo-card-body">
                  <div className="repo-top-row"><Skeleton w={26} h={26} /><Skeleton w={110} h={14} /></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    <Skeleton w="100%" h={11} /><Skeleton w="80%" h={11} />
                  </div>
                  <Skeleton w={100} h={20} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--t6)" }}>
            <p style={{ fontSize: 13.5 }}>
              {repos.length === 0 ? "No repos came back for this category." : `No loaded repos match "${query}".`}
            </p>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((repo, i) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                index={i}
                aiEntry={aiState[repo.id]}
                onGetTake={handleGetTake}
                onOpen={setOpenRepo}
              />
            ))}
          </div>
        )}
      </div>

      {openRepo && <DetailModal repo={openRepo} onClose={() => setOpenRepo(null)} />}
    </div>
  );
}