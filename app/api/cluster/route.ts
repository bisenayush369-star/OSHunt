import { NextRequest, NextResponse } from "next/server";

interface GitHubRepo {
  name: string;
  full_name?: string;
  fork?: boolean;
  description?: string | null;
  license?: { key: string; name: string } | null;
  homepage?: string | null;
  topics?: string[];
  language?: string | null;
  open_issues_count?: number;
  stargazers_count?: number;
  forks_count?: number;
  owner?: { login: string };
  default_branch?: string;
}
interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name: string };
  payload?: {
    commits?: unknown[];
    ref?: string;
    action?: string;
    number?: number;
    pull_request?: { title?: string };
    issue?: { number?: number };
  };
}
interface TimelineItem {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  type: "commit" | "pr" | "issue" | "review";
}
interface TopRepo {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  hasDescription: boolean;
  hasLicense: boolean;
  hasHomepage: boolean;
  hasTopics: boolean;
  stars: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let username = searchParams.get("username") || "torvalds";
  const token = request.headers.get("authorization")?.replace("Bearer ", "") || process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    ...(token && { "Authorization": `token ${token}` }),
  };

  try {
    // 1. FIX: Resolve numerical GitHub IDs to text usernames
    if (/^\d+$/.test(username)) {
      const userLookup = await fetch(`https://api.github.com/user/${username}`, { headers });
      if (userLookup.ok) {
        const userData = await userLookup.json();
        username = userData.login;
      } else {
        throw new Error("Could not resolve numerical GitHub ID.");
      }
    }

    // 2. Fetch Raw Repositories using the resolved string username
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`, { headers, next: { revalidate: 60 } });
    if (!reposRes.ok) {
      const errData = await reposRes.json();
      throw new Error(errData.message || "Failed to fetch GitHub repos.");
    }
    const repos: GitHubRepo[] = await reposRes.json();

    // 3. Fetch Raw Public Events (Timeline Activity)
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=15`, { headers, next: { revalidate: 60 } });
    const events: GitHubEvent[] = eventsRes.ok ? await eventsRes.json() : [];

    // 4. Process Raw Metrics
    const totalRepos = repos.length;
    const activeBugs = repos.reduce((acc, repo) => acc + (repo.open_issues_count || 0), 0);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentEvents = events.filter((e) => new Date(e.created_at) > oneWeekAgo);
    const gitVelocity = `${recentEvents.length} events this week`;

    const lastContributionTime = events.length > 0
      ? new Date(events[0].created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
      : "No recent activity";

    // 5. Process Timeline Events into Clean UI Feed
    const timeline: TimelineItem[] = events.slice(0, 6).map((event) => {
      let action = "Interacted with repository";
      let type: TimelineItem["type"] = "commit";

      if (event.type === "PushEvent") {
        const commitCount = event.payload?.commits?.length || 1;
        action = `Pushed ${commitCount} commit${commitCount > 1 ? "s" : ""} to ${event.payload?.ref?.replace("refs/heads/", "") || "main"}`;
        type = "commit";
      } else if (event.type === "PullRequestEvent") {
        action = `${event.payload?.action === "opened" ? "Opened" : "Merged"} PR #${event.payload?.number}: ${event.payload?.pull_request?.title?.slice(0, 40) || "code update"}...`;
        type = "pr";
      } else if (event.type === "IssuesEvent") {
        action = `${event.payload?.action === "opened" ? "Opened" : "Closed"} issue #${event.payload?.issue?.number}`;
        type = "issue";
      } else if (event.type === "WatchEvent") {
        action = "Starred repository";
        type = "review";
      }

      return {
        id: event.id,
        action,
        target: event.repo?.name || "unknown",
        timestamp: new Date(event.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        type,
      };
    });

    // 6. Extract Top Languages
    const languages = Array.from(new Set(repos.map((r) => r.language).filter((l): l is string => Boolean(l))));

    // 7. Real signals for the profile scoring prompt — all pulled from data
    // already in `repos` (zero additional API calls).
    const nonForkRepos = repos.filter((r) => !r.fork);
    const externalContributionRepos = events
      .map((e) => e.repo?.name)
      .filter((name): name is string => Boolean(name) && !name!.toLowerCase().startsWith(`${username.toLowerCase()}/`));

    const signals = {
      originalRepoCount: nonForkRepos.length,
      forkedRepoCount: repos.length - nonForkRepos.length,
      reposWithDescription: nonForkRepos.filter((r) => r.description && r.description.trim().length > 0).length,
      reposWithLicense: nonForkRepos.filter((r) => r.license).length,
      reposWithHomepage: nonForkRepos.filter((r) => r.homepage && r.homepage.trim().length > 0).length,
      reposWithTopics: nonForkRepos.filter((r) => r.topics && r.topics.length > 0).length,
      totalForksReceived: repos.reduce((acc, r) => acc + (r.forks_count || 0), 0),
      recentEventCount: recentEvents.length,
      externalActivityRepoCount: new Set(externalContributionRepos).size,
    };

    // 8. Enough per-repo detail for the Repo Audit tab: top 6 non-fork repos
    // by recency (auditing all 50 would mean 50+ extra API calls on demand).
    const topRepos: TopRepo[] = nonForkRepos.slice(0, 6).map((r) => ({
      owner: r.owner?.login || username,
      name: r.name,
      fullName: r.full_name || `${r.owner?.login || username}/${r.name}`,
      defaultBranch: r.default_branch || "main",
      hasDescription: Boolean(r.description && r.description.trim().length > 0),
      hasLicense: Boolean(r.license),
      hasHomepage: Boolean(r.homepage && r.homepage.trim().length > 0),
      hasTopics: Boolean(r.topics && r.topics.length > 0),
      stars: r.stargazers_count || 0,
    }));

    return NextResponse.json({
      metrics: {
        totalRepos,
        activeBugs,
        gitVelocity,
        lastContributionTime,
      },
      timeline,
      rawContext: {
        username,
        topLanguages: languages.slice(0, 5),
        recentRepoNames: repos.slice(0, 5).map((r) => r.name),
        totalStars: repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0),
        totalRepos,
        topRepos,
        signals,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 500 });
  }
}