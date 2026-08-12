// ─────────────────────────────────────────────────────────────────────────
// Static reference data, not fetched — and deliberately so. No GitHub API,
// REST or GraphQL, exposes which achievements a given user has actually
// earned; the only place that's visible is the profile page's own
// Achievements tab (github.com/{username}?tab=achievements), rendered
// server-side with no public data feed behind it. Confirmed via GitHub's
// own community forum before writing this file: a maintainer response
// states plainly there's no endpoint for it.
//
// So this catalog answers "what exists and how do I earn it" — real,
// stable, verifiable information — and the component using this data does
// NOT claim to know which ones a given user already has. It links out to
// the user's own achievements tab so they can check themselves.
// ─────────────────────────────────────────────────────────────────────────

export interface Achievement {
  slug: string;
  name: string;
  howToEarn: string;
  tiers: string[] | null; // null = single-tier, no bronze/silver/gold
  obtainable: boolean; // some are historical/no longer earnable
}

export const ACHIEVEMENT_CATALOG: Achievement[] = [
  {
    slug: "pull-shark",
    name: "Pull Shark",
    howToEarn: "Have a pull request merged.",
    tiers: ["2", "16", "128", "1024"],
    obtainable: true,
  },
  {
    slug: "galaxy-brain",
    name: "Galaxy Brain",
    howToEarn: "Get an answer accepted on a GitHub Discussion.",
    tiers: ["2", "8", "16", "32"],
    obtainable: true,
  },
  {
    slug: "pair-extraordinaire",
    name: "Pair Extraordinaire",
    howToEarn: "Co-author commits on a merged pull request.",
    tiers: ["1", "10", "24", "48"],
    obtainable: true,
  },
  {
    slug: "starstruck",
    name: "Starstruck",
    howToEarn: "Create a repository that earns a number of stars.",
    tiers: ["16", "128", "512", "4096"],
    obtainable: true,
  },
  {
    slug: "open-sourcerer",
    name: "Open Sourcerer",
    howToEarn: "Have pull requests merged in multiple public repositories.",
    tiers: null,
    obtainable: true,
  },
  {
    slug: "quickdraw",
    name: "Quickdraw",
    howToEarn: "Close an issue or pull request within 5 minutes of opening it.",
    tiers: null,
    obtainable: true,
  },
  {
    slug: "yolo",
    name: "YOLO",
    howToEarn: "Merge a pull request without a review.",
    tiers: null,
    obtainable: true,
  },
  {
    slug: "public-sponsor",
    name: "Public Sponsor",
    howToEarn: "Sponsor an open source contributor or organization through GitHub Sponsors.",
    tiers: null,
    obtainable: true,
  },
  {
    slug: "heart-on-your-sleeve",
    name: "Heart On Your Sleeve",
    howToEarn: "React to a comment, issue, or discussion (exact criteria not publicly documented by GitHub).",
    tiers: null,
    obtainable: true,
  },
  {
    slug: "arctic-code-vault-contributor",
    name: "Arctic Code Vault Contributor",
    howToEarn: "No longer obtainable — awarded historically for repos included in the 2020 GitHub Archive Program.",
    tiers: null,
    obtainable: false,
  },
  {
    slug: "mars-2020-contributor",
    name: "Mars 2020 Contributor",
    howToEarn: "No longer obtainable — awarded historically for contributions related to the Mars 2020 Helicopter Mission repos.",
    tiers: null,
    obtainable: false,
  },
];
