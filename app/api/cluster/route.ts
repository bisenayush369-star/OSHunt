import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateLLMResponse } from "@/lib/llmRouter";
import { canAffordUsage, consumeQuota } from "@/lib/quota";

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
  stars: number;
}
interface ActivityInsights {
  busiestDay: string | null;
  mostCommonActivity: string | null;
  trend: string;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quotaCheck = await canAffordUsage(session.user.id, { ai: 1 });
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: quotaCheck.reason, reason: quotaCheck.reason }, { status: 403 });
  }

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

    // 8. Lightweight per-repo references — top 6 non-fork repos by recency.
    // Previously fed the (now-removed) Repositories explore tab; kept here
    // because Profile Checkup needs somewhere to point when it names an
    // "affected repository" for an issue. Fetching full detail (README,
    // commits, contributors) for all 50 repos would mean 50+ extra API
    // calls nobody asked for, so this stays intentionally shallow.
    const topRepos: TopRepo[] = nonForkRepos.slice(0, 6).map((r) => ({
      owner: r.owner?.login || username,
      name: r.name,
      fullName: r.full_name || `${r.owner?.login || username}/${r.name}`,
      stars: r.stargazers_count || 0,
    }));

    // 9. Lightweight activity insights for the Live Activity tab — plain-
    // language signals only, computed from events already fetched above.
    // Deliberately no chart/heatmap data (spec calls for "keep it clean").
    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let activityInsights: ActivityInsights = {
      busiestDay: null,
      mostCommonActivity: null,
      trend: "No recent activity",
    };
    if (events.length > 0) {
      const dayCounts = new Array(7).fill(0);
      events.forEach((e) => {
        dayCounts[new Date(e.created_at).getDay()]++;
      });
      const busiestDayIndex = dayCounts.indexOf(Math.max(...dayCounts));

      const typeCounts: Record<string, number> = {};
      events.forEach((e) => {
        const label =
          e.type === "PushEvent" ? "Commits" :
          e.type === "PullRequestEvent" ? "Pull requests" :
          e.type === "IssuesEvent" ? "Issues" :
          e.type === "WatchEvent" ? "Stars" : "Other activity";
        typeCounts[label] = (typeCounts[label] || 0) + 1;
      });
      const mostCommonActivity = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];

      const now = Date.now();
      const daysSinceLast = (now - new Date(events[0].created_at).getTime()) / 86_400_000;
      const last3Days = events.filter((e) => (now - new Date(e.created_at).getTime()) / 86_400_000 <= 3).length;

      let trend = "Steady pace";
      if (daysSinceLast > 7) trend = "Quiet lately";
      else if (last3Days === 0) trend = "Cooling off";
      else if (last3Days / events.length > 0.5) trend = "Picking up pace";

      activityInsights = { busiestDay: DAY_NAMES[busiestDayIndex], mostCommonActivity, trend };
    }

    // Spec: the summary should call out the single biggest strength, the
    // single biggest weakness, and one actionable recommendation — under
    // 150 words. Previously just asked for "2-3 short sentences."
    const clusterPrompt = `You are a concise open-source portfolio analyst. Using only the facts below, respond in under 150 words covering exactly three things: (1) the single biggest strength in this profile, (2) the single biggest weakness, and (3) one specific, actionable recommendation. Do not invent any statistics or repository names, and do not use markdown headers — three short sentences or a tight paragraph is enough.`;
    const clusterContext = [
      `Username: ${username}`,
      `Public repos: ${totalRepos}`,
      `Original repos: ${nonForkRepos.length}`,
      `Forked repos: ${repos.length - nonForkRepos.length}`,
      `Top languages: ${languages.slice(0, 5).join(", ") || "none detected"}`,
      `Recent public events in the last 7 days: ${recentEvents.length}`,
      `Total stars: ${repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0)}`,
      `Open issues across repos: ${activeBugs}`,
      `Repos with descriptions: ${signals.reposWithDescription}`,
      `Repos with licenses: ${signals.reposWithLicense}`,
      `Repos with homepages: ${signals.reposWithHomepage}`,
      `Repos with topics: ${signals.reposWithTopics}`,
      `Top recent repo names: ${repos.slice(0, 5).map((r) => r.name).join(", ")}`,
    ].join("\n");

    let clusterInsight: string | null = null;
    try {
      const { text } = await generateLLMResponse(
        [{ role: "user", content: `GitHub data:\n${clusterContext}` }],
        clusterPrompt
      );
      await consumeQuota(session.user.id, { ai: 1 });
      clusterInsight = text?.trim() ?? null;
    } catch (err) {
      console.error("LLM cluster summary failed:", err);
    }

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
      clusterInsight,
      activityInsights,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 500 });
  }
}
