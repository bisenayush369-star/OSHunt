import { getFileContent } from "../github"
import type { GitTreeEntry } from "../types"
import { REPO_EXPLORATION_TOOLS, type ToolDefinition } from "./tools"
import { generateLLMResponseWithTools } from "../../llmRouter"

/**
 * This agent loop expects tool/function-calling support from the LLM layer.
 * The router now exposes a tool-aware entry point via
 * `generateLLMResponseWithTools`, and this file uses that as its default
 * execution path when no custom generator is injected.
 */
export interface ToolCallRequest {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AgenticLLMResponse {
  text: string | null
  toolCalls: ToolCallRequest[] | null
}

export type AgenticChatMessage =
  | { role: "user" | "assistant"; content: string }
  | { role: "tool"; toolCallId: string; content: string }

export type GenerateWithTools = (
  messages: AgenticChatMessage[],
  systemPrompt: string,
  tools: ToolDefinition[]
) => Promise<AgenticLLMResponse>

export interface AgenticAnalyzeOptions {
  maxTurns?: number
  maxFileReadsPerTurn?: number
  /** Hard ceiling on total characters read across the whole session, so a
   *  misbehaving loop can't quietly turn into an unbounded GitHub-API-call
   *  and token spend. Same spirit as the fixed budget in smartRead.ts, just
   *  enforced across turns instead of in one upfront pass. */
  maxTotalCharsRead?: number
}

export interface AgenticAnalyzeResult {
  finalText: string
  turnsUsed: number
  filesRead: string[]
  totalCharsRead: number
}

export function createRouterDrivenGenerate(): GenerateWithTools {
  return async (messages, systemPrompt, tools) => {
    const response = await generateLLMResponseWithTools(messages, systemPrompt, tools)
    return {
      text: response.text,
      toolCalls: response.toolCalls,
    }
  }
}

/**
 * Runs the model in a loop with read_file / list_directory / search_files
 * tools instead of stuffing a fixed, heuristically-chosen context upfront.
 * This is the same shape Cursor's agent mode, Copilot Workspace, and Devin
 * use for repo exploration — the model asks for what it actually needs
 * given the specific question, rather than us guessing in advance what
 * "probably matters" for every possible question.
 *
 * `generate` is injected rather than imported directly so this stays
 * testable and provider-agnostic — wire it to whatever llmRouter.ts exposes
 * once it supports tool calls.
 */
export async function runAgenticAnalysis(
  owner: string,
  repo: string,
  tree: GitTreeEntry[],
  systemPrompt: string,
  initialUserPrompt: string,
  generate?: GenerateWithTools,
  opts: AgenticAnalyzeOptions = {}
): Promise<AgenticAnalyzeResult> {
  const maxTurns = opts.maxTurns ?? 8
  const maxFileReadsPerTurn = opts.maxFileReadsPerTurn ?? 5
  const maxTotalCharsRead = opts.maxTotalCharsRead ?? 120_000

  const knownPaths = new Set(tree.map((f) => f.path))
  const messages: AgenticChatMessage[] = [{ role: "user", content: initialUserPrompt }]
  const generator = generate ?? createRouterDrivenGenerate()

  const filesRead: string[] = []
  let totalCharsRead = 0

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await generator(messages, systemPrompt, REPO_EXPLORATION_TOOLS)

    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        finalText: response.text ?? "",
        turnsUsed: turn + 1,
        filesRead,
        totalCharsRead,
      }
    }

    messages.push({ role: "assistant", content: response.text ?? "" })

    const callsThisTurn = response.toolCalls.slice(0, maxFileReadsPerTurn)
    for (const call of callsThisTurn) {
      const result = await executeToolCall(call, owner, repo, tree, knownPaths, {
        remainingBudget: maxTotalCharsRead - totalCharsRead,
      })
      if (call.name === "read_file" && result.ok) {
        filesRead.push(String(call.arguments.path))
        totalCharsRead += result.content.length
      }
      messages.push({ role: "tool", toolCallId: call.id, content: result.content })
    }

    if (totalCharsRead >= maxTotalCharsRead) {
      messages.push({
        role: "user",
        content: "Read budget for this session is exhausted — give your best answer with what you've seen so far instead of requesting more files.",
      })
    }
  }

  // Ran out of turns without the model concluding on its own — ask for a
  // final answer directly rather than returning nothing.
  const final = await generator(
    [...messages, { role: "user", content: "Give your final answer now, using only what you've already read." }],
    systemPrompt,
    []
  )
  return { finalText: final.text ?? "", turnsUsed: maxTurns, filesRead, totalCharsRead }
}

async function executeToolCall(
  call: ToolCallRequest,
  owner: string,
  repo: string,
  tree: GitTreeEntry[],
  knownPaths: Set<string>,
  opts: { remainingBudget: number }
): Promise<{ ok: boolean; content: string }> {
  try {
    if (call.name === "read_file") {
      const path = String(call.arguments.path ?? "")
      if (!knownPaths.has(path)) {
        return { ok: false, content: `No file at "${path}" in this repository. Use list_directory or search_files to find the real path.` }
      }
      const cap = Math.max(0, Math.min(20_000, opts.remainingBudget))
      if (cap === 0) return { ok: false, content: "Read budget exhausted for this session." }
      const content = await getFileContent(owner, repo, path, cap)
      return content !== null
        ? { ok: true, content }
        : { ok: false, content: `Could not read "${path}" (binary, too large, or unavailable).` }
    }

    if (call.name === "list_directory") {
      const dir = String(call.arguments.path ?? "").replace(/\/$/, "")
      const prefix = dir ? `${dir}/` : ""
      const entries = tree
        .filter((f) => f.path.startsWith(prefix) && !f.path.slice(prefix.length).includes("/"))
        .map((f) => f.path.slice(prefix.length))
      return { ok: true, content: entries.length ? entries.join("\n") : "(empty or no such directory)" }
    }

    if (call.name === "search_files") {
      const q = String(call.arguments.query ?? "").toLowerCase()
      const matches = tree.map((f) => f.path).filter((p) => p.toLowerCase().includes(q)).slice(0, 50)
      return { ok: true, content: matches.length ? matches.join("\n") : "No matching paths." }
    }

    return { ok: false, content: `Unknown tool "${call.name}".` }
  } catch (err) {
    return { ok: false, content: `Tool execution failed: ${err instanceof Error ? err.message : "unknown error"}` }
  }
}
