// ─────────────────────────────────────────────────────────────────────────
// Static, curated, not LLM-generated — a model producing this list risks
// hallucinating a URL that looks right and 404s. Every link below was
// verified as current and correct before being hardcoded, not recalled
// from training data alone.
// ─────────────────────────────────────────────────────────────────────────

export interface LearningResource {
  title: string;
  description: string;
  url: string;
  topic: "readme" | "pinning" | "achievements" | "markdown" | "contributing";
}

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    title: "Managing your profile README",
    description: "GitHub's own guide to setting up the special README that appears at the top of your profile.",
    url: "https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme",
    topic: "readme",
  },
  {
    title: "Pinning items to your profile",
    description: "How to choose which repositories or gists show up first when someone visits your profile.",
    url: "https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile",
    topic: "pinning",
  },
  {
    title: "Profile reference (Achievements & Sponsors)",
    description: "GitHub's reference page covering how Achievements, pinned items, and sponsorship visibility work together.",
    url: "https://docs.github.com/en/account-and-profile/reference/profile-reference",
    topic: "achievements",
  },
  {
    title: "Contributions on your profile",
    description: "How your contribution graph and Achievements are calculated, and what counts as a public contribution.",
    url: "https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile",
    topic: "achievements",
  },
  {
    title: "Basic writing and formatting syntax",
    description: "GitHub Flavored Markdown reference — headings, images, tables, task lists — for writing a README that reads well.",
    url: "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax",
    topic: "markdown",
  },
  {
    title: "How to Contribute to Open Source",
    description: "GitHub's own opensource.guide walkthrough for making a first contribution, from finding a project to opening a PR.",
    url: "https://opensource.guide/how-to-contribute/",
    topic: "contributing",
  },
];
