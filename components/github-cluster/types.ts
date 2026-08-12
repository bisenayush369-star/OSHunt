// Shared types for the GitHub Cluster feature.
// These mirror the JSON shapes returned by /api/cluster and /api/diagnostic —
// if either route's response shape changes, update the matching type here.

export interface ClusterMetrics {
  totalRepos: number;
  activeBugs: number;
  gitVelocity: string;
  lastContributionTime: string;
}

export interface TimelineItem {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  type: "commit" | "pr" | "issue" | "review";
}

export interface TopRepo {
  owner: string;
  name: string;
  fullName: string;
  stars: number;
}

export interface ClusterSignals {
  originalRepoCount: number;
  forkedRepoCount: number;
  reposWithDescription: number;
  reposWithLicense: number;
  reposWithHomepage: number;
  reposWithTopics: number;
  totalForksReceived: number;
  recentEventCount: number;
  externalActivityRepoCount: number;
}

export interface RawContext {
  username: string;
  topLanguages: string[];
  recentRepoNames: string[];
  totalStars: number;
  totalRepos: number;
  topRepos: TopRepo[];
  signals: ClusterSignals;
}

// Lightweight, non-chart activity insights (busiest day / most common type /
// trend) computed server-side in /api/cluster from the same events already
// fetched for the timeline — zero extra GitHub API calls.
export interface ActivityInsights {
  busiestDay: string | null;
  mostCommonActivity: string | null;
  trend: string;
}

export interface CategoryScore {
  name: string;
  score: number;
  why: string;
  /**
   * Optional third explanation dimension: the single biggest weakness behind
   * this score, distinct from `why`. Not emitted by /api/diagnostic yet —
   * CategoryCard renders around its absence until that route adds it.
   */
  weakness?: string;
  howToImprove: string;
}

export interface WeeklyRoadmap {
  weekLabel: string;
  tasks: string[];
  estimatedScoreGain: number;
  estimatedTime: string;
}

export interface ProfileScoreResult {
  overallScore: number;
  categories: CategoryScore[];
  roadmap: WeeklyRoadmap;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
}

export type ClusterTab = "overview" | "career" | "checkup";

export interface GitHubClusterSectionProps {
  username?: string;
  connected?: boolean;
  plan?: string;
  avatarUrl?: string;
  stats?: { reposScanned?: number; matches?: number };
}
