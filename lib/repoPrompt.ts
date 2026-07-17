export interface RepoMetadataInput {
  repoName: string
  language?: string | null
  rawDescription?: string | null
  stars?: number
  forks?: number
  openIssues?: number
  createdAt?: string
  pushedAt?: string
  topics?: string[]
}

export function formatRepoPrompt(input: RepoMetadataInput): string {
  return `Repository: ${input.repoName}
Language: ${input.language || "unknown"}
Raw Description: ${input.rawDescription || "(no description provided)"}
Stars: ${input.stars ?? "unknown"}
Forks: ${input.forks ?? "unknown"}
Open Issues: ${input.openIssues ?? "unknown"}
Created: ${input.createdAt ?? "unknown"}
Last Pushed: ${input.pushedAt ?? "unknown"}
Topics: ${input.topics?.length ? input.topics.join(", ") : "none"}`
}
