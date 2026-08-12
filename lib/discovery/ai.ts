import type { AiInsights, Repo } from "@/types/discovery";

/**
 * This is a free-resource directory, not a contribution finder. The card only
 * needs a short, deterministic summary of what a repo is and how to start
 * using it, so we derive that locally from the metadata already available in
 * the discovery result.
 */
export async function fetchAiInsights(repo: Repo): Promise<AiInsights> {
  return buildRuleBasedInsights(repo);
}

function buildRuleBasedInsights(repo: Repo): AiInsights {
  const description = repo.description?.trim();
  const language = repo.language ?? "code";
  const topics = repo.topics.map((topic) => topic.toLowerCase());
  const topicText = topics.join(" ");
  const combined = `${description ?? ""} ${topicText} ${language}`.toLowerCase();

  if (combined.includes("llm") || combined.includes("ai") || combined.includes("machine learning") || combined.includes("ml")) {
    return {
      whatItDoes: "An AI or machine-learning project for building, experimenting with, or integrating intelligent features.",
      howToUse: "Start by reading the README, installing dependencies, and running the example or CLI command listed there.",
      goodFor: "Teams exploring AI features or model integrations",
    };
  }

  if (combined.includes("cli") || combined.includes("command line") || combined.includes("terminal")) {
    return {
      whatItDoes: "A command-line tool that helps automate tasks or simplify workflows from your terminal.",
      howToUse: "Install it with the package manager shown in the README, then run the main command with your preferred flags.",
      goodFor: "Developers who want faster terminal workflows",
    };
  }

  if (combined.includes("framework") || combined.includes("react") || combined.includes("next") || combined.includes("vue") || combined.includes("svelte") || combined.includes("angular")) {
    return {
      whatItDoes: "A frontend framework or UI library for building web apps and interactive interfaces.",
      howToUse: "Follow the quickstart steps in the README to scaffold a project and begin building with the provided components.",
      goodFor: "Teams building web products or UI-heavy apps",
    };
  }

  if (combined.includes("api") || combined.includes("backend") || combined.includes("server") || combined.includes("service")) {
    return {
      whatItDoes: "A backend or API project focused on serving data, processing requests, or powering app features.",
      howToUse: "Set up the local environment, install the dependencies, and launch the server using the documented start command.",
      goodFor: "Developers building services or integrations",
    };
  }

  if (description) {
    return {
      whatItDoes: `A project about ${description}`,
      howToUse: `Review the README and run the setup steps for ${language} to get started quickly.`,
      goodFor: "Developers looking for a practical starter project",
    };
  }

  return {
    whatItDoes: `An open-source ${language} project that appears relevant to the current discovery category.`,
    howToUse: "Check the README for setup instructions, install steps, and the recommended local command to run it.",
    goodFor: "Developers browsing useful open-source tools",
  };
}
