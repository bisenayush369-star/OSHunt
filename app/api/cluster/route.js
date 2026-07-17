import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let username = searchParams.get("username") || "torvalds"; 
  const token = request.headers.get("authorization")?.replace("Bearer ", "") || process.env.GITHUB_TOKEN;

  const headers = {
    "Accept": "application/vnd.github.v3+json",
    ...(token && { "Authorization": `token ${token}` })
  };

  try {
    // 1. FIX: Resolve numerical GitHub IDs to text usernames
    // If the input is just numbers (like 24154467), fetch the real login name first
    if (/^\d+$/.test(username)) {
      const userLookup = await fetch(`https://api.github.com/user/${username}`, { headers });
      if (userLookup.ok) {
        const userData = await userLookup.json();
        username = userData.login; // Converts "24154467" into your actual GitHub handle
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
    const repos = await reposRes.json();

    // 3. Fetch Raw Public Events (Timeline Activity)
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=15`, { headers, next: { revalidate: 60 } });
    const events = eventsRes.ok ? await eventsRes.json() : [];

    // 4. Process Raw Metrics
    const totalRepos = repos.length;
    const activeBugs = repos.reduce((acc, repo) => acc + (repo.open_issues_count || 0), 0);
    
    // Calculate Commit Velocity (events in last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentEvents = events.filter((e) => new Date(e.created_at) > oneWeekAgo);
    const gitVelocity = `${recentEvents.length} events this week`;

    // Last contribution timestamp
    const lastContributionTime = events.length > 0 
      ? new Date(events[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
      : "No recent activity";

    // 5. Process Timeline Events into Clean UI Feed
    const timeline = events.slice(0, 6).map((event) => {
      let action = "Interacted with repository";
      let type = "commit";

      if (event.type === "PushEvent") {
        const commitCount = event.payload.commits?.length || 1;
        action = `Pushed ${commitCount} commit${commitCount > 1 ? 's' : ''} to ${event.payload.ref?.replace('refs/heads/', '') || 'main'}`;
        type = "commit";
      } else if (event.type === "PullRequestEvent") {
        action = `${event.payload.action === 'opened' ? 'Opened' : 'Merged'} PR #${event.payload.number}: ${event.payload.pull_request?.title?.slice(0, 40) || 'code update'}...`;
        type = "pr";
      } else if (event.type === "IssuesEvent") {
        action = `${event.payload.action === 'opened' ? 'Opened' : 'Closed'} issue #${event.payload.issue?.number}`;
        type = "issue";
      } else if (event.type === "WatchEvent") {
        action = "Starred repository";
        type = "review";
      }

      return {
        id: event.id,
        action,
        target: event.repo.name,
        timestamp: new Date(event.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        type
      };
    });

    // 6. Extract Top Languages for AI diagnostic
    const languages = Array.from(new Set(repos.map((r) => r.language).filter(Boolean)));

    return NextResponse.json({
      metrics: {
        totalRepos,
        activeBugs,
        totalContributions: events.length * 12, 
        gitVelocity,
        lastContributionTime
      },
      timeline,
      rawContext: {
        username, // This now safely passes your text string handle (e.g. "octocat") to the frontend
        topLanguages: languages.slice(0, 5),
        recentRepoNames: repos.slice(0, 5).map((r) => r.name),
        totalStars: repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}