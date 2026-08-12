/**
 * Tool definitions for agentic repo exploration. This is the shape virtually
 * every current LLM provider's tool/function-calling API expects (Anthropic,
 * OpenAI, Gemini all converge on "name + description + JSON Schema
 * parameters") — if llmRouter.ts wraps more than one provider, this same
 * definition can typically be passed through with only minor translation,
 * not a rewrite.
 */

export interface ToolParameterSchema {
  type: "object"
  properties: Record<string, { type: string; description: string; items?: { type: string } }>
  required: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameterSchema
}

export const REPO_EXPLORATION_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Read the full contents of one file from this repository, by its exact path as it appears in the repository structure. Use this whenever you need to see a file that wasn't already included in the context, or need more of a file that was shown truncated.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Exact repo-relative file path, e.g. \"src/routes/users.ts\"" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_directory",
    description:
      "List the files and subdirectories directly inside a given directory path. Use this to explore an area of the repo you haven't seen yet before deciding which specific file to read.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative directory path, e.g. \"src/lib\". Use \"\" for the repo root." },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description:
      "Search file *paths* (not contents) in the repo for ones matching a substring or pattern — e.g. to find every file related to \"auth\" or every test file. For searching file contents, read_file the specific files you suspect are relevant instead; this tool does not grep inside files.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring to match against file paths, case-insensitive." },
      },
      required: ["query"],
    },
  },
]

export type ToolName = (typeof REPO_EXPLORATION_TOOLS)[number]["name"]
