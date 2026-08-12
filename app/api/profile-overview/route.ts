import { NextRequest, NextResponse } from "next/server";
import { getGithubAuthHeader } from "@/lib/github";

// ─────────────────────────────────────────────────────────────────────────
// Pure data fetch, no LLM call — every field here is either directly off
// GET /users/{username} or one of two small follow-up calls. No inference,
// no scoring; that reasoning happens in /api/profile-checkup, which takes
// this route's output as one of its inputs.
//
// Two things this route deliberately does NOT attempt, both verified before
// writing this:
//   - Pinned repositories: no REST endpoint exposes these. GitHub only
//     exposes pinned items via GraphQL (`pinnedItems` on the User type),
//     which needs a token and a different request shape (POST to
//     /graphql with a query body) than every other route in this app.
//     Not added here to avoid a second, inconsistent fetch pattern for one
//     field — worth a dedicated follow-up if you want it badly enough to
//     justify that.
//   - Profile README existence IS checkable (a repo named
//     {username}/{username} with a README) and is included below.
// ─────────────────────────────────────────────────────────────────────────

interface GitHubUser {
  login: string;
  name?: string | null;
  avatar_url: string;
  bio?: string | null;
  location?: string | null;
  blog?: string | null;
  company?: string | null;
  hireable?: boolean | null;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
}
interface GitHubOrg {
  login: string;
  avatar_url: string;
}
interface SocialAccount {
  provider: string;
  url: string;
}

export interface ProfileOverview {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  hireable: boolean;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  accountAgeYears: number;
  organizations: { login: string; avatarUrl: string }[];
  socialAccounts: { provider: string; url: string }[];
  hasProfileReadme: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") || "torvalds";
  const authHeader = await getGithubAuthHeader();

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    ...(authHeader.Authorization ? { Authorization: authHeader.Authorization } : {}),
  };

  try {
    let resolvedUsername = username;
    if (/^\d+$/.test(username)) {
      const userLookup = await fetch(`https://api.github.com/user/${username}`, { headers, next: { revalidate: 300 } });
      if (userLookup.ok) {
        const userData = await userLookup.json();
        resolvedUsername = userData.login;
      } else {
        throw new Error("Could not resolve numerical GitHub ID to a username.");
      }
    }

    const userRes = await fetch(`https://api.github.com/users/${resolvedUsername}`, { headers, next: { revalidate: 300 } });
    if (!userRes.ok) throw new Error("Couldn't fetch this GitHub profile.");
    const user: GitHubUser = await userRes.json();

    // Best-effort — a failure on any of these degrades that one field
    // instead of failing the whole overview, since none of them are more
    // load-bearing than the core profile fetch above.
    const [orgsRes, socialRes, readmeRes] = await Promise.allSettled([
      fetch(`https://api.github.com/users/${username}/orgs`, { headers }),
      fetch(`https://api.github.com/users/${username}/social_accounts`, { headers }),
      fetch(`https://api.github.com/repos/${username}/${username}/readme`, { headers }),
    ]);

    let organizations: GitHubOrg[] = [];
    if (orgsRes.status === "fulfilled" && orgsRes.value.ok) {
      organizations = await orgsRes.value.json();
    }

    let socialAccounts: SocialAccount[] = [];
    if (socialRes.status === "fulfilled" && socialRes.value.ok) {
      socialAccounts = await socialRes.value.json();
    }

    const hasProfileReadme = readmeRes.status === "fulfilled" && readmeRes.value.ok;

    const createdAt = new Date(user.created_at);
    const accountAgeYears = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365));

    const overview: ProfileOverview = {
      username: user.login,
      name: user.name ?? null,
      avatarUrl: user.avatar_url,
      bio: user.bio ?? null,
      location: user.location ?? null,
      website: user.blog?.trim() || null,
      hireable: Boolean(user.hireable),
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      publicGists: user.public_gists,
      accountAgeYears,
      organizations: organizations.map((o) => ({ login: o.login, avatarUrl: o.avatar_url })),
      socialAccounts: socialAccounts.map((s) => ({ provider: s.provider, url: s.url })),
      hasProfileReadme,
    };

    return NextResponse.json({ result: overview });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch profile overview." }, { status: 500 });
  }
}
