import { createHash } from "node:crypto";
import { prisma } from "@/components/lib/prisma";
import { sendApiLimitAlert } from "./emailAlert";
import { trackUsage } from "./admin/usage";
import type { ToolDefinition } from "./repoIntelligence/agent/tools";

// =====================================================================================
// llmRouter.ts: sends every LLM request to a provider that has a key in .env.
// =====================================================================================
//
// .env settings (all optional; restart `npm run dev` after editing .env)
//
//   <PROVIDER>_MODEL        Change a model without touching code: GROQ_MODEL, NVIDIA_MODEL, GEMINI_MODEL,
//                           COHERE_MODEL, ANTHROPIC_MODEL, GITHUB_MODELS_MODEL, ... A missing or empty value
//                           falls back to the default written below.
//   LLM_PROVIDER_ORDER      A fixed order, for example   GEMINI,NVIDIA,COHERE   (providers not named come after them)
//                           or   NVIDIA,GROQ,*,ANTHROPIC   (* = all the others; Anthropic only as a last resort).
//   LLM_AUTO_ORDER=off      Only if you want the old random order back while LLM_PROVIDER_ORDER is empty.
//   LLM_WARN_PROMPT_TOKENS  Warn when a prompt is bigger than this (default 8000).
//   ANTHROPIC_MAX_TOKENS    Output ceiling for Claude (default 16000).
//
// HOW THE ORDER IS CHOSEN
//   1. LLM_PROVIDER_ORDER, when set, decides the order of the providers it names.
//   2. For all the others (or for everyone, when it is empty) the router uses what it has learned: it remembers
//      how long each provider took to answer, separately for big prompts (about 4,000 tokens or more) and small
//      ones, and tries the fastest first. A provider it has not measured yet is guessed at 15 s (big) or 3 s
//      (small), so a provider that turned out slow (Cohere took 87 s) goes behind the ones it has not tried yet.
//   3. Nothing is ever cut off. A slow provider is simply tried later, and its full answer is used when it is
//      the only one left.
//
// SAME PROMPT AT THE SAME TIME
//   When an identical request is already running, the second one waits for it and shares its answer: one call
//   to the provider and one lot of tokens. Requests that follow each other (for example a retry after a bad
//   answer) are never merged.
//
// ANSWER CACHE (opt-in per call: nothing is cached unless the call asks for it)
//   const { text } = await generateLLMResponse(messages, system, {
//     cacheTtlSeconds: 6 * 60 * 60, // keep the answer for 6 hours
//     validate: looksLikeJson,      // only keep answers that are usable (optional, but recommended)
//   });
//   The answer is looked up by the exact prompt (system + messages), so a changed repo or a changed question
//   is a new prompt and gets a fresh answer. By default answers are kept in memory (lost on restart). For a
//   cache that is shared by all server instances and survives restarts, add this model to prisma/schema.prisma
//   and run `npx prisma db push`. The router finds it by itself, and works without it.
//
//     model LlmCache {
//       key        String   @id
//       text       String   @db.Text
//       tokensUsed Int
//       provider   String
//       createdAt  DateTime @default(now())
//       expiresAt  DateTime
//       @@index([expiresAt])
//     }
//
// LIMITS AND NAMES (the Neon ApiProvider table stays an optional overlay)
//   A provider is known by ONE name everywhere: the router, the ApiProvider table and the admin page all use
//   the names in KNOWN_LLM_PROVIDERS (GEMINI, ANTHROPIC, GROQ, ...). A row is matched to its provider ignoring
//   case and spaces, and a few spellings count as the same name ("Claude" is ANTHROPIC, "Hugging Face" is
//   HUGGINGFACE), so when you swap Gemini for Anthropic you only change the key in .env (and add or rename the
//   row to ANTHROPIC): the admin page then shows Anthropic's limit and problems by name.
//
// ADMIN PAGE
//   getLLMProviderSnapshots() and getLLMSavings() give the admin page what only this file knows: which model each
//   provider uses, whether a key is set (yes or no, never the key), what needs fixing and what is being skipped.
//   Nothing returned from them contains a key, a URL or text written by a provider.
//
// Every request prints how big its prompt is, and warns above 8,000 tokens.
function pick(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

// 1. Configuration for the OpenAI-Compatible Providers
interface ProviderConfig {
  url: string;
  model: string;
  apiKey: string | undefined;
}

const OPENAI_COMPATIBLE_PROVIDERS: Record<string, ProviderConfig> = {
  // FIX: Groq model ids carry the publisher prefix ("openai/gpt-oss-20b"), without it Groq returns model_not_found.
  GROQ: { url: "https://api.groq.com/openai/v1", model: pick(process.env.GROQ_MODEL, "openai/gpt-oss-20b"), apiKey: process.env.GROQ_API_KEY },
  OPENROUTER: { url: "https://openrouter.ai/api/v1", model: pick(process.env.OPENROUTER_MODEL, "openai/gpt-oss-120b"), apiKey: process.env.OPENROUTER_API_KEY },
  NVIDIA: { url: "https://integrate.api.nvidia.com/v1", model: pick(process.env.NVIDIA_MODEL, "nvidia/nemotron-3-ultra-550b-a55b"), apiKey: process.env.NVIDIA_API_KEY },
  DEEPSEEK: { url: "https://api.deepseek.com/v1", model: pick(process.env.DEEPSEEK_MODEL, "deepseek-v4-flash"), apiKey: process.env.DEEPSEEK_API_KEY },
  // FIX: "mistral-open-128b" is not a real model id (HTTP 400 invalid_model).
  // "mistral-large-latest" returned 403 tier_not_allowed on this account, so default to the small model.
  MISTRAL: { url: "https://api.mistral.ai/v1", model: pick(process.env.MISTRAL_MODEL, "mistral-small-latest"), apiKey: process.env.MISTRAL_API_KEY },
  SILICONFLOW: { url: "https://api.siliconflow.cn/v1", model: pick(process.env.SILICONFLOW_MODEL, "deepseek-ai/DeepSeek-V4-Flash"), apiKey: process.env.SILICONFLOW_API_KEY },
  // FIX: api-inference.huggingface.co is the legacy host (it returns no address in nslookup).
  // The current OpenAI-compatible endpoint is router.huggingface.co/v1.
  HUGGINGFACE: {
    url: "https://router.huggingface.co/v1",
    model: pick(process.env.HUGGINGFACE_MODEL, "meta-llama/Llama-3.1-8B-Instruct"),
    apiKey: process.env.HUGGINGFACE_API_KEY,
  },
  // FIX: models.inference.ai.azure.com no longer exists in DNS (Non-existent domain).
  // GitHub Models now lives at models.github.ai/inference. Model ids use "publisher/model" format,
  // so set GITHUB_MODELS_MODEL in .env to any id from https://github.com/marketplace/models.
  // The token must be a GitHub PAT with the "models" permission.
  GITHUB_MODELS: {
    url: "https://models.github.ai/inference",
    model: pick(process.env.GITHUB_MODELS_MODEL, "deepseek/DeepSeek-V3-0324"),
    apiKey: process.env.GITHUB_MODELS_KEY,
  },
};

const GEMINI_MODEL = pick(process.env.GEMINI_MODEL, "gemini-3.1-flash-lite");
const COHERE_MODEL = pick(process.env.COHERE_MODEL, "command-a-03-2025");

// Anthropic (Claude) has its own native handler, callAnthropic(), further down.
// Ids from Anthropic's models page: claude-haiku-5-5 (cheapest, fastest), claude-sonnet-5-5,
// claude-opus-5-5, claude-fable-5-1.
const ANTHROPIC_MODEL = pick(process.env.ANTHROPIC_MODEL, "claude-haiku-5-5");
// max_tokens is only a ceiling (you pay for tokens actually generated), but thinking tokens count toward it.
const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 16000;

// --- The provider names: ONE list, used by the router, the database rows and the admin page ----------
/** Every provider the router can use, in the order it lists them. Add a new provider here and in the handlers. */
export const KNOWN_LLM_PROVIDERS: readonly string[] = [...Object.keys(OPENAI_COMPATIBLE_PROVIDERS), "GEMINI", "COHERE", "ANTHROPIC"];
const KNOWN_PROVIDERS = KNOWN_LLM_PROVIDERS;

const PROVIDER_LABELS: Record<string, string> = {
  GROQ: "Groq",
  OPENROUTER: "OpenRouter",
  NVIDIA: "NVIDIA",
  DEEPSEEK: "DeepSeek",
  MISTRAL: "Mistral",
  SILICONFLOW: "SiliconFlow",
  HUGGINGFACE: "Hugging Face",
  GITHUB_MODELS: "GitHub Models",
  GEMINI: "Gemini",
  COHERE: "Cohere",
  ANTHROPIC: "Anthropic",
};

// Other spellings of the same provider (only true synonyms: nothing here may mean a different service).
const NAME_ALIASES: Record<string, string> = {
  CLAUDE: "ANTHROPIC",
  GOOGLE_GEMINI: "GEMINI",
  HF: "HUGGINGFACE",
  HUGGING_FACE: "HUGGINGFACE",
  SILICON_FLOW: "SILICONFLOW",
  OPEN_ROUTER: "OPENROUTER",
  DEEP_SEEK: "DEEPSEEK",
  MISTRAL_AI: "MISTRAL",
  GITHUB_MODEL: "GITHUB_MODELS",
  NVIDIA_NIM: "NVIDIA",
};

/** "Gemini", " gemini ", "Hugging Face" and "Claude" become GEMINI, GEMINI, HUGGINGFACE and ANTHROPIC. */
export function normalizeProviderName(raw: string): string {
  const key = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s.-]+/g, "_")
    .replace(/_+/g, "_");
  return NAME_ALIASES[key] ?? key;
}

/**
 * Matches database rows (ApiProvider) to provider names. An exact row ("GEMINI") beats a loose one ("Gemini ").
 * Rows for names the router does not know are kept under their normalised name, so a caller can list them.
 */
export function matchProviderRows<T extends { name: string }>(rows: T[]): Map<string, T> {
  const byName = new Map<string, T>();
  for (const row of rows) {
    const key = normalizeProviderName(row.name);
    const known = byName.get(key);
    if (!known || (row.name === key && known.name !== key)) byName.set(key, row);
  }
  return byName;
}

function keyFor(name: string): string | undefined {
  if (name === "GEMINI") return process.env.GEMINI_API_KEY;
  if (name === "COHERE") return process.env.COHERE_API_KEY;
  if (name === "ANTHROPIC") return process.env.ANTHROPIC_API_KEY;
  return OPENAI_COMPATIBLE_PROVIDERS[name]?.apiKey;
}

// --- State that has to survive hot reloads -------------------------------------------------
// `next dev` runs this file again whenever you save code, which would forget the cooldowns, the
// "STILL BROKEN" list and what the router has learned about each provider's speed. Keeping them on
// globalThis (the same trick the Prisma client uses) makes them survive. The version number makes
// sure state left behind by an older copy of this file is never reused.
type CacheEntry = { text: string; tokensUsed: number; provider: string; createdAt: number; expiresAt: number };
type RunOutcome = { result: ProviderResult; provider: string };
type Cooldown = { until: number; reason: string };
type Broken = { problem: string; fix: string; since: number };

interface RouterState {
  version: number;
  cooldown: Map<string, Cooldown>; // provider -> skipped until, and why
  broken: Map<string, Broken>; // providers that stay broken until you change something
  speedMs: Map<string, number>; // "heavy:GEMINI" -> average answer time in ms
  inFlight: Map<string, { promise: Promise<RunOutcome>; tag: string }>; // identical requests that are running now
  cache: Map<string, CacheEntry>; // answers kept in memory (opt-in per call)
  requestCounter: number;
  running: number; // how many requests are talking to providers right now
  orderSettingChecked: boolean;
  memoryOnlyNoticeShown: boolean;
  sharedCacheBroken: boolean;
  sharedCacheWarnedAt: number;
  lastCacheCleanup: number;
  rowNoticeShown: Set<string>;
  saved: { since: number; shared: number; cacheHits: number; tokens: number };
}

const STATE_VERSION = 3;
const globalForRouter = globalThis as typeof globalThis & { __llmRouterState?: RouterState };

function createState(): RouterState {
  return {
    version: STATE_VERSION,
    cooldown: new Map(),
    broken: new Map(),
    speedMs: new Map(),
    inFlight: new Map(),
    cache: new Map(),
    requestCounter: 0,
    running: 0,
    orderSettingChecked: false,
    memoryOnlyNoticeShown: false,
    sharedCacheBroken: false,
    sharedCacheWarnedAt: 0,
    lastCacheCleanup: 0,
    rowNoticeShown: new Set(),
    saved: { since: Date.now(), shared: 0, cacheHits: 0, tokens: 0 },
  };
}

const existingState = globalForRouter.__llmRouterState;
const state: RouterState =
  existingState && existingState.version === STATE_VERSION
    ? existingState
    : (globalForRouter.__llmRouterState = createState());

// If a provider fails with a network/DNS error, skip it for a while instead of
// retrying (and logging the same error) on every single request.
const NETWORK_COOLDOWN_MS = 5 * 60 * 1000;
const NETWORK_ERROR_CODES = new Set(["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"]);

function setCooldown(name: string, ms: number, reason: string) {
  state.cooldown.set(name, { until: Date.now() + ms, reason });
}

function activeCooldown(name: string, now = Date.now()): Cooldown | undefined {
  const entry = state.cooldown.get(name);
  return entry && entry.until > now ? entry : undefined;
}

// Auth / billing / config errors won't fix themselves between requests, so stop
// hammering those providers (and adding latency) until the key or plan is fixed.
const HTTP_COOLDOWN_MS: Record<number, number> = {
  401: 30 * 60 * 1000, // bad key
  402: 30 * 60 * 1000, // no balance
  403: 30 * 60 * 1000, // key lacks permission
  404: 30 * 60 * 1000, // wrong endpoint / model
  429: 60 * 1000, // rate limited
};

// A provider that answers 200 with a body that is not JSON (GitHub Models answered a plain "OK") will do the
// same on the next request, so skip it for a while instead of paying for that call every time.
const CONFIG_COOLDOWN_MS = 30 * 60 * 1000;

// "Too big" is about this one prompt, not about the key or the model, so it gets no red banner and no
// cooldown: the next, smaller prompt may well be accepted.
const PROMPT_TOO_BIG =
  /context length|context window|maximum context|too many tokens|too large|too long|reduce (your|the) (message|prompt|input)/i;

// Anthropic reports an empty balance as HTTP 400 ("Your credit balance is too low ..."), others as 402 or 403.
const NO_CREDIT = /credit balance|insufficient[_ ](credit|funds|balance)|out of credit|payment required/i;

// --- Loud terminal banners for failures a human has to fix -------------------
const RED_BG = "\x1b[41m\x1b[97m\x1b[1m"; // white bold text on red background
const RED = "\x1b[31m\x1b[1m";
const YELLOW = "\x1b[33m\x1b[1m";
const RESET = "\x1b[0m";

const ENV_VAR_BY_PROVIDER: Record<string, string> = {
  GROQ: "GROQ_API_KEY",
  OPENROUTER: "OPENROUTER_API_KEY",
  NVIDIA: "NVIDIA_API_KEY",
  DEEPSEEK: "DEEPSEEK_API_KEY",
  MISTRAL: "MISTRAL_API_KEY",
  SILICONFLOW: "SILICONFLOW_API_KEY",
  HUGGINGFACE: "HUGGINGFACE_API_KEY",
  GITHUB_MODELS: "GITHUB_MODELS_KEY",
  GEMINI: "GEMINI_API_KEY",
  COHERE: "COHERE_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
};

// Providers that stay broken until you change something. Cleared on first success.
const needsFixing = state.broken;

function printFixBanner(provider: string, problem: string, howToFix: string, detail = "") {
  const before = needsFixing.get(provider);
  needsFixing.set(provider, { problem, fix: howToFix, since: before && before.problem === problem ? before.since : Date.now() });
  const envVar = ENV_VAR_BY_PROVIDER[provider] ?? "(see .env)";
  const spaced = provider.replace(/_/g, " ").split("").join(" ");
  const width = 78;
  const blank = " ".repeat(width);
  const row = (text: string) => ` ${text}`.padEnd(width, " ");

  console.error(
    [
      "",
      `${RED_BG}${blank}${RESET}`,
      `${RED_BG}${row(`${spaced}  —  API FAILED, CHANGE IT NOW`)}${RESET}`,
      `${RED_BG}${blank}${RESET}`,
      `${RED_BG}${row(`PROBLEM : ${problem}`)}${RESET}`,
      `${RED_BG}${row(`FIX     : ${howToFix}`)}${RESET}`,
      `${RED_BG}${row(`MODEL   : ${modelFor(provider)}  (set ${provider}_MODEL in .env)`)}${RESET}`,
      `${RED_BG}${row(`ENV VAR : ${envVar}  (restart npm run dev after changing)`)}${RESET}`,
      `${RED_BG}${blank}${RESET}`,
      detail ? `${RED}Server said:${RESET} ${detail}` : "",
      "",
    ].join("\n")
  );
}

/**
 * What a failed HTTP status means for a human, in words the router wrote itself (never text from the provider).
 * Returns null for statuses that are not a "change something" problem (429 rate limits, 5xx, prompt too big).
 * Used for the terminal banners and by the admin page.
 */
export function describeHttpFailure(provider: string, status: number, detail = ""): { problem: string; fix: string } | null {
  if (status === 401) return { problem: "INVALID OR DELETED API KEY", fix: "Generate a new key in the provider dashboard" };
  if (status === 402 || ((status === 400 || status === 403) && NO_CREDIT.test(detail))) {
    return { problem: "NO CREDIT / BALANCE LEFT", fix: "Add credit, or delete this key from .env" };
  }
  if (status === 403 && /tier|subscription|plan/i.test(detail)) {
    return { problem: "MODEL NOT ALLOWED ON YOUR PLAN (key is OK)", fix: `Use another model: set ${provider}_MODEL in .env` };
  }
  if (status === 403) {
    return provider === "HUGGINGFACE"
      ? { problem: "TOKEN HAS NO PERMISSION", fix: "Token needs 'Make calls to Inference Providers'" }
      : { problem: "KEY HAS NO PERMISSION", fix: "Create a new key with the required permission" };
  }
  if (status === 404) return { problem: "WRONG MODEL NAME OR URL", fix: `Set ${provider}_MODEL in .env (or check the base URL)` };
  if (status === 400 && /model/i.test(detail)) return { problem: "INVALID MODEL NAME", fix: `Set a valid id in ${provider}_MODEL in .env` };
  return null;
}

/**
 * The words for an HTTP 200 whose body is not JSON (GitHub Models once answered a plain "OK"). The usage row of such a
 * call has status 200 and ok = false, so the admin page uses these words for it as well.
 */
export const NON_JSON_FAILURE = {
  problem: "REPLIED WITH A NON-JSON BODY",
  fix: "Test the base URL and model id with curl",
} as const;

function noteHttpFailure(provider: string, status: number, detail: string) {
  const cooldown = HTTP_COOLDOWN_MS[status];

  // Checked before the "invalid model" case, because context-length errors also contain the word "model".
  if (status === 413 || (status === 400 && PROMPT_TOO_BIG.test(detail))) {
    console.warn(
      `${YELLOW}[LLM] ✗ ${provider}: this prompt is too big for it (HTTP ${status}). ` +
        `Shorten the prompt, or put ${provider} last in LLM_PROVIDER_ORDER. Server said: ${detail}${RESET}`
    );
    return;
  }

  const action = describeHttpFailure(provider, status, detail);
  if (action) {
    setCooldown(provider, CONFIG_COOLDOWN_MS, action.problem); // this will not fix itself between requests
    printFixBanner(provider, action.problem, action.fix, detail);
    return;
  }

  if (cooldown) setCooldown(provider, cooldown, status === 429 ? "Rate limit or quota hit (HTTP 429)" : `HTTP ${status}`);
  console.warn(
    `[LLM] ✗ ${provider} HTTP ${status} ${detail}` +
      (cooldown ? ` — skipping ${provider} for ${cooldown / 60000} min` : "")
  );
}

type ChatMessage = { role: string; content: string };
export interface AgenticToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgenticLLMResponse {
  text: string | null;
  toolCalls: AgenticToolCall[] | null;
}

// inputTokens / outputTokens are only filled when the provider reports them (output includes thinking tokens).
type ProviderResult = {
  text: string | null;
  tokensUsed: number;
  toolCalls: AgenticToolCall[] | null;
  inputTokens?: number;
  outputTokens?: number;
};

// Optional third argument of generateLLMResponse(). Nothing is cached unless cacheTtlSeconds is set.
export interface LLMCallOptions {
  /** Keep the answer for this many seconds and give it to the next identical prompt without calling a provider. */
  cacheTtlSeconds?: number;
  /** Only keep answers for which this returns true (for example looksLikeJson). Without it, every answer is kept. */
  validate?: (text: string) => boolean;
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const fmt = (n: number) => n.toLocaleString("en-US");
const approxTokens = (chars: number) => Math.ceil(chars / 4); // rough rule of thumb: ~4 characters per token
const WARN_PROMPT_TOKENS = Number(process.env.LLM_WARN_PROMPT_TOKENS) || 8000;

// Sizes only, never the content, so nothing private ends up in the logs.
function describePromptSize(messages: ChatMessage[], systemPrompt: string | undefined, tools: ToolDefinition[]) {
  const systemChars = (systemPrompt ?? "").length;
  const messageChars = messages.map((m) => (typeof m.content === "string" ? m.content.length : 0));
  const allMessageChars = messageChars.reduce((a, b) => a + b, 0);
  const toolChars =
    tools.length > 0
      ? JSON.stringify(tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }))).length
      : 0;

  let biggest = -1;
  messageChars.forEach((chars, i) => {
    if (biggest === -1 || chars > messageChars[biggest]) biggest = i;
  });

  const total = approxTokens(systemChars + allMessageChars + toolChars);
  const messagePart =
    `${messages.length} message${messages.length === 1 ? "" : "s"} ~${fmt(approxTokens(allMessageChars))}` +
    (messages.length > 1 && biggest >= 0
      ? ` (biggest: #${biggest + 1} ${messages[biggest].role} ~${fmt(approxTokens(messageChars[biggest]))})`
      : "");
  const parts = [
    `system ~${fmt(approxTokens(systemChars))}`,
    messagePart,
    `${tools.length} tool${tools.length === 1 ? "" : "s"} ~${fmt(approxTokens(toolChars))}`,
  ];
  return { total, text: `Prompt ≈ ${fmt(total)} tokens (estimate): ${parts.join(" | ")}` };
}

function modelFor(name: string): string {
  if (name === "GEMINI") return GEMINI_MODEL;
  if (name === "COHERE") return COHERE_MODEL;
  if (name === "ANTHROPIC") return ANTHROPIC_MODEL;
  return OPENAI_COMPATIBLE_PROVIDERS[name]?.model ?? "unknown";
}

function describeError(error: unknown): { code: string | null; message: string } {
  const err = error as { message?: string; cause?: { code?: string; message?: string } } | undefined;
  const code = err?.cause?.code ?? null;
  const message = err?.cause?.message ?? err?.message ?? String(error);
  return { code, message };
}

function toOpenAIMessages(messages: ChatMessage[], systemPrompt?: string) {
  return systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages;
}

function parseToolCallArguments(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeToolCalls(toolCalls: unknown): AgenticToolCall[] | null {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

  return toolCalls
    .map((call, index) => {
      const callData = call as Record<string, unknown> | undefined;
      const functionData = callData?.function as Record<string, unknown> | undefined;
      const functionName = typeof functionData?.name === "string" ? functionData.name : "";
      if (!functionName) return null;

      return {
        id: typeof callData?.id === "string" ? callData.id : `tool-${index}`,
        name: functionName,
        arguments: parseToolCallArguments(functionData?.arguments),
      };
    })
    .filter((call): call is AgenticToolCall => call !== null);
}

// --- One HTTP exchange: send, read the body, parse it ----------------------------------------
// The body is read INSIDE trackUsage, so the usage row gets the real duration and the token counts
// (the admin page shows tokens per provider from those rows).
type Exchange = { response: Response; raw: string; data: any };
type Usage = { total?: number; input?: number; output?: number };

async function exchange(send: () => Promise<Response>): Promise<Exchange> {
  const response = await send();
  // A good answer must be read completely (a cut-off body is a failure); for an error the text is only for the log.
  const raw = response.ok ? await response.text() : await response.text().catch(() => "");
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { response, raw, data };
}

const openAiUsage = (d: any): Usage => ({
  total: num(d?.usage?.total_tokens),
  input: num(d?.usage?.prompt_tokens),
  output: num(d?.usage?.completion_tokens),
});

function geminiUsage(d: any): Usage {
  // totalTokenCount = prompt + answer + thinking tokens, so "output" below includes the thinking.
  const total = num(d?.usageMetadata?.totalTokenCount);
  const input = num(d?.usageMetadata?.promptTokenCount);
  return { total, input, output: input !== undefined ? Math.max((total ?? 0) - input, 0) : undefined };
}

function pairUsage(input: number | undefined, output: number | undefined): Usage {
  return { total: (input ?? 0) + (output ?? 0), input, output };
}
const cohereUsage = (d: any): Usage => pairUsage(num(d?.usage?.tokens?.input_tokens), num(d?.usage?.tokens?.output_tokens));
const anthropicUsage = (d: any): Usage => pairUsage(num(d?.usage?.input_tokens), num(d?.usage?.output_tokens));

/** The columns of the usage row. When a provider only reports a total, it is kept (as "in") so sums stay right. */
const usageColumns = (u: Usage) => ({
  tokensIn: u.input ?? (u.output === undefined ? u.total : undefined),
  tokensOut: u.output,
});

const usageRead = (usage: (d: any) => Usage) => (e: Exchange) => ({
  status: e.response.status,
  ok: e.response.ok && e.data !== null,
  ...usageColumns(usage(e.data)),
});

// 2. Universal API Call Wrapper (With Safety Guards)
async function callOpenAICompatible(
  provider: string,
  url: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string,
  tools: ToolDefinition[] = []
): Promise<ProviderResult | null> {
  if (!apiKey) return null; // Skip if key is empty

  const body: Record<string, unknown> = {
    model,
    messages: toOpenAIMessages(messages, systemPrompt),
  };

  if (tools.length > 0) {
    body.tools = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
    body.tool_choice = "auto";
  }

  const x = await trackUsage(
    { service: "llm", provider, model, endpoint: `${url}/chat/completions` },
    () =>
      exchange(() =>
        fetch(`${url}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            // GitHub's docs list these two headers for their inference API.
            ...(provider === "GITHUB_MODELS"
              ? { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
              : {}),
          },
          body: JSON.stringify(body),
        })
      ),
    usageRead(openAiUsage)
  );

  if (!x.response.ok) {
    noteHttpFailure(provider, x.response.status, x.raw.slice(0, 200));
    return null; // Skip if API is down
  }

  // A non-JSON 200 (e.g. a plain "OK") is logged clearly instead of throwing "Unexpected token 'O'".
  if (x.data === null) {
    setCooldown(provider, CONFIG_COOLDOWN_MS, "Replied with a non-JSON body");
    printFixBanner(provider, NON_JSON_FAILURE.problem, `${NON_JSON_FAILURE.fix} (skipped for 30 min)`, x.raw.slice(0, 120));
    return null;
  }
  const message = x.data?.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content : null;
  const toolCalls = normalizeToolCalls(message?.tool_calls);
  if (!text && !toolCalls) return null;
  const usage = openAiUsage(x.data);
  return { text, tokensUsed: usage.total ?? 0, toolCalls, inputTokens: usage.input, outputTokens: usage.output };
}

// 3. Custom Native Handlers (Gemini & Cohere)
async function callGemini(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string
): Promise<ProviderResult | null> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: Record<string, unknown> = { contents };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

  const x = await trackUsage(
    { service: "llm", provider: "GEMINI", model: GEMINI_MODEL, endpoint: `POST /models/${GEMINI_MODEL}:generateContent` },
    () =>
      exchange(() =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        )
      ),
    usageRead(geminiUsage)
  );
  if (!x.response.ok) {
    noteHttpFailure("GEMINI", x.response.status, x.raw.slice(0, 200));
    return null;
  }
  if (x.data === null) throw new Error(`GEMINI replied with a body that is not JSON: ${x.raw.slice(0, 80)}`);

  const text = x.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const usage = geminiUsage(x.data);
  return { text, tokensUsed: usage.total ?? 0, toolCalls: null, inputTokens: usage.input, outputTokens: usage.output };
}

async function callCohere(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string
): Promise<ProviderResult | null> {
  // FIX: the old /v1/chat endpoint returned 404. Use the v2 chat API, which also
  // takes the full message history instead of only the last user message.
  const x = await trackUsage(
    { service: "llm", provider: "COHERE", model: COHERE_MODEL, endpoint: "POST /v2/chat" },
    () =>
      exchange(() =>
        fetch(`https://api.cohere.com/v2/chat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: COHERE_MODEL, messages: toOpenAIMessages(messages, systemPrompt) }),
        })
      ),
    usageRead(cohereUsage)
  );
  if (!x.response.ok) {
    noteHttpFailure("COHERE", x.response.status, x.raw.slice(0, 200));
    return null;
  }
  if (x.data === null) throw new Error(`COHERE replied with a body that is not JSON: ${x.raw.slice(0, 80)}`);

  const text = x.data?.message?.content?.find((c: { type?: string }) => c.type === "text")?.text;
  if (!text) return null;
  const usage = cohereUsage(x.data);
  return { text, tokensUsed: usage.total ?? 0, toolCalls: null, inputTokens: usage.input, outputTokens: usage.output };
}

// 4. Anthropic (Claude): native Messages API, POST /v1/messages.
// Differences from the OpenAI format: the system prompt is a top-level field, tools use
// "input_schema", and the reply is a list of "text" / "tool_use" blocks.
function toAnthropicTurns(messages: ChatMessage[], systemPrompt?: string) {
  const system: string[] = systemPrompt ? [systemPrompt] : [];
  const turns: { role: "user" | "assistant"; content: string }[] = [];

  for (const m of messages) {
    if (typeof m.content !== "string" || !m.content.trim()) continue; // Anthropic rejects empty text
    if (m.role === "system") {
      system.push(m.content); // system messages go into the top-level system field
      continue;
    }
    const role = m.role === "assistant" ? "assistant" : "user"; // anything else counts as user, like in callGemini
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n\n${m.content}`; // keep user/assistant alternating
    else turns.push({ role, content: m.content });
  }

  // The conversation has to start with a user turn.
  while (turns.length > 0 && turns[0].role === "assistant") turns.shift();

  return { system: system.join("\n\n") || undefined, turns };
}

async function callAnthropic(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string,
  tools: ToolDefinition[] = []
): Promise<ProviderResult | null> {
  const { system, turns } = toAnthropicTurns(messages, systemPrompt);
  if (turns.length === 0) return null;

  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    messages: turns,
  };
  if (system) body.system = system;
  if (tools.length > 0) {
    body.tools = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters ?? { type: "object", properties: {} },
    }));
    // tool_choice is left out on purpose: "auto" is the default when tools are sent.
  }

  const x = await trackUsage(
    { service: "llm", provider: "ANTHROPIC", model: ANTHROPIC_MODEL, endpoint: "POST /v1/messages" },
    () =>
      exchange(() =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        })
      ),
    usageRead(anthropicUsage)
  );
  if (!x.response.ok) {
    noteHttpFailure("ANTHROPIC", x.response.status, x.raw.slice(0, 200));
    return null;
  }
  if (x.data === null) throw new Error(`ANTHROPIC replied with a body that is not JSON: ${x.raw.slice(0, 80)}`);

  // The reply is a list of blocks. Only "text" and "tool_use" are used; "thinking" blocks are ignored.
  const blocks: Array<{ type?: string; text?: string; id?: string; name?: string; input?: unknown }> =
    Array.isArray(x.data?.content) ? x.data.content : [];
  const text =
    blocks
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("") || null;
  const toolCalls: AgenticToolCall[] = blocks
    .filter((b) => b.type === "tool_use" && typeof b.name === "string")
    .map((b, index) => ({
      id: b.id ?? `tool-${index}`,
      name: b.name as string,
      arguments: parseToolCallArguments(b.input),
    }));
  if (!text && toolCalls.length === 0) return null;

  const usage = anthropicUsage(x.data);
  return {
    text,
    tokensUsed: usage.total ?? 0,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    inputTokens: usage.input,
    outputTokens: usage.output,
  };
}

// 5. Provider order: fixed from .env, or fastest first from what the router has learned
const AUTO_ORDER = (process.env.LLM_AUTO_ORDER ?? "").trim().toLowerCase() !== "off";
const HEAVY_PROMPT_TOKENS = 4000; // prompts this big or bigger are timed separately from small ones
type PromptWeight = "heavy" | "light";
// What the router assumes about a provider it has not timed yet (for that kind of prompt).
const GUESS_MS: Record<PromptWeight, number> = { heavy: 15_000, light: 3_000 };

const speedKey = (weight: PromptWeight, name: string) => `${weight}:${name}`;
const expectedMs = (name: string, weight: PromptWeight) => state.speedMs.get(speedKey(weight, name)) ?? GUESS_MS[weight];

// Half the old average and half the new answer: reacts within two answers when a provider gets slower or faster.
function recordSpeed(name: string, weight: PromptWeight, ms: number) {
  const key = speedKey(weight, name);
  const old = state.speedMs.get(key);
  state.speedMs.set(key, old === undefined ? ms : (old + ms) / 2);
}

function shuffle<T>(items: T[]): T[] {
  // Fisher-Yates, because sort(() => Math.random() - 0.5) doesn't give a uniform shuffle.
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Fastest first. Providers with the same expectation (for example none timed yet) stay in random order,
// because the sort is stable and the list is shuffled first.
function byExpectedSpeed(names: string[], weight: PromptWeight): string[] {
  const shuffled = shuffle(names);
  return AUTO_ORDER ? shuffled.sort((a, b) => expectedMs(a, weight) - expectedMs(b, weight)) : shuffled;
}

function readOrderSetting(): string[] {
  return (process.env.LLM_PROVIDER_ORDER ?? "")
    .split(",")
    .map((s) => normalizeProviderName(s))
    .filter(Boolean);
}

// "*" stands for "all providers not named in the list" (fastest first). Without a "*",
// the providers that are not named simply come after the named ones.
function orderProviders(available: string[], weight: PromptWeight): string[] {
  const wanted = readOrderSetting();
  if (wanted.length === 0) return byExpectedSpeed(available, weight);

  const named = new Set(wanted);
  const rest = byExpectedSpeed(available.filter((name) => !named.has(name)), weight);
  const ordered: string[] = [];
  let restPlaced = false;

  for (const name of wanted) {
    if (name === "*") {
      if (!restPlaced) ordered.push(...rest);
      restPlaced = true;
    } else if (available.includes(name) && !ordered.includes(name)) {
      ordered.push(name);
    }
  }
  if (!restPlaced) ordered.push(...rest);
  return ordered;
}

// A typo in LLM_PROVIDER_ORDER would otherwise be ignored silently, so say so once per server start.
function checkOrderSettingOnce(candidateNames: string[]) {
  if (state.orderSettingChecked) return;
  state.orderSettingChecked = true;

  const wanted = readOrderSetting().filter((name) => name !== "*");
  const unknown = wanted.filter((name) => !KNOWN_PROVIDERS.includes(name));
  if (unknown.length > 0) {
    console.warn(
      `[LLM] ⚠ LLM_PROVIDER_ORDER has unknown name(s): ${unknown.join(", ")}. ` +
        `Valid names: ${KNOWN_PROVIDERS.join(", ")} (and * for "all the others").`
    );
  }
  const noKey = wanted.filter((name) => KNOWN_PROVIDERS.includes(name) && !candidateNames.includes(name));
  if (noKey.length > 0) {
    console.warn(
      `[LLM] ⚠ LLM_PROVIDER_ORDER lists ${noKey.join(", ")} but no API key is set for it ` +
        `(${noKey.map((name) => ENV_VAR_BY_PROVIDER[name]).join(", ")}), so it is skipped.`
    );
  }
}

// 6. Same prompt twice, and the optional answer cache
const CACHE_MAX_ENTRIES = 300; // memory cache: the oldest answers are dropped beyond this
const CACHE_MAX_TTL_SECONDS = 30 * 24 * 60 * 60;
const CACHE_CLEANUP_EVERY_MS = 60 * 60 * 1000; // delete expired rows from the shared table at most once an hour

// Two prompts are "the same" only when the system prompt and every message are identical.
function promptKey(messages: ChatMessage[], systemPrompt: string | undefined): string {
  return createHash("sha256")
    .update(JSON.stringify([systemPrompt ?? "", messages.map((m) => [m.role, typeof m.content === "string" ? m.content : ""])]))
    .digest("hex");
}

function cloneResult(result: ProviderResult): ProviderResult {
  return {
    ...result,
    toolCalls: result.toolCalls ? result.toolCalls.map((call) => ({ ...call, arguments: { ...call.arguments } })) : null,
  };
}

function agoText(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 120) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

// True for a JSON answer, also when the model wrapped it in a ```json fence or added a sentence around it.
// Meant for the `validate` option, so a broken answer is never kept in the cache.
export function looksLikeJson(text: string): boolean {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  if (!cleaned) return false;
  try {
    JSON.parse(cleaned);
    return true;
  } catch {
    // fall through: look for the JSON inside the text
  }
  const start = cleaned.search(/[\[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end <= start) return false;
  try {
    JSON.parse(cleaned.slice(start, end + 1));
    return true;
  } catch {
    return false;
  }
}

// The shared cache lives in the optional LlmCache model. It is looked up at run time (not imported), so this file
// still compiles and works when the model is not in your schema yet.
type SharedCacheRow = { text: string; tokensUsed: number; provider: string; createdAt: Date; expiresAt: Date };
type SharedCacheTable = {
  findUnique(args: { where: { key: string } }): Promise<SharedCacheRow | null>;
  upsert(args: { where: { key: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<unknown>;
  deleteMany(args: { where: { expiresAt: { lt: Date } } }): Promise<unknown>;
};

function sharedCacheTable(): SharedCacheTable | null {
  if (state.sharedCacheBroken) return null;
  const table = (prisma as unknown as { llmCache?: SharedCacheTable }).llmCache;
  if (!table) {
    if (!state.memoryOnlyNoticeShown) {
      state.memoryOnlyNoticeShown = true;
      console.log(
        "[LLM] ℹ Answer cache is memory-only (no LlmCache model in your Prisma schema): it is lost on restart and not " +
          "shared between server instances. See the top of llmRouter.ts to add the table."
      );
    }
    return null;
  }
  return table;
}

// Only "the table is not there / does not match" turns the shared cache off for good. A passing database
// hiccup just costs one cache miss, and is reported at most once a minute.
const TABLE_MISSING = /does not exist|doesn't exist|no such table|Unknown (argument|field)|P2021|P2022/i;

function handleSharedCacheError(error: unknown) {
  const code = (error as { code?: string } | undefined)?.code;
  const message = describeError(error).message;
  if (code === "P2021" || code === "P2022" || TABLE_MISSING.test(message)) {
    state.sharedCacheBroken = true;
    console.warn(
      `[LLM] ⚠ The shared answer cache (LlmCache table) is not usable, so answers are kept in memory only. ` +
        `Run "npx prisma db push" after adding the LlmCache model (see the top of llmRouter.ts). Reason: ${message}`
    );
    return;
  }
  if (Date.now() - state.sharedCacheWarnedAt > 60_000) {
    state.sharedCacheWarnedAt = Date.now();
    console.warn(`[LLM] ⚠ Shared answer cache: database call failed once (${message}). Using memory for now.`);
  }
}

function rememberInMemory(key: string, entry: CacheEntry) {
  state.cache.delete(key); // insert again so the newest answers are the last to be dropped
  state.cache.set(key, entry);
  while (state.cache.size > CACHE_MAX_ENTRIES) {
    const oldest = state.cache.keys().next().value;
    if (oldest === undefined) break;
    state.cache.delete(oldest);
  }
}

async function readCache(key: string): Promise<(CacheEntry & { from: "memory" | "database" }) | null> {
  const now = Date.now();
  const inMemory = state.cache.get(key);
  if (inMemory) {
    if (inMemory.expiresAt > now) return { ...inMemory, from: "memory" };
    state.cache.delete(key);
  }

  const table = sharedCacheTable();
  if (!table) return null;
  try {
    const row = await table.findUnique({ where: { key } });
    if (row && row.expiresAt.getTime() > now) {
      const entry: CacheEntry = {
        text: row.text,
        tokensUsed: row.tokensUsed,
        provider: row.provider,
        createdAt: row.createdAt.getTime(),
        expiresAt: row.expiresAt.getTime(),
      };
      rememberInMemory(key, entry);
      return { ...entry, from: "database" };
    }
  } catch (error) {
    handleSharedCacheError(error);
  }
  return null;
}

async function writeCache(key: string, outcome: RunOutcome, ttlMs: number) {
  const now = Date.now();
  const entry: CacheEntry = {
    text: outcome.result.text ?? "",
    tokensUsed: outcome.result.tokensUsed,
    provider: outcome.provider,
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  rememberInMemory(key, entry);

  const table = sharedCacheTable();
  if (!table) return;
  try {
    const data = {
      text: entry.text,
      tokensUsed: entry.tokensUsed,
      provider: entry.provider,
      createdAt: new Date(entry.createdAt),
      expiresAt: new Date(entry.expiresAt),
    };
    await table.upsert({ where: { key }, create: { key, ...data }, update: data });
    if (now - state.lastCacheCleanup > CACHE_CLEANUP_EVERY_MS) {
      state.lastCacheCleanup = now;
      await table.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }); // keep Neon small
    }
  } catch (error) {
    handleSharedCacheError(error);
  }
}

function isStorable(result: ProviderResult, validate?: (text: string) => boolean): boolean {
  if (!result.text || result.toolCalls) return false;
  if (!validate) return true;
  try {
    return validate(result.text) === true;
  } catch {
    return false; // a validate function that crashes must never break the request
  }
}

// 7. The request itself
async function generateLLMResponseInternal(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  tools: ToolDefinition[] = [],
  options: LLMCallOptions = {}
): Promise<ProviderResult> {
  // Numbered, because several requests can run at the same time and their lines get mixed up.
  const tag = `[LLM #${++state.requestCounter}]`;

  // Requests with tools are agent steps: always fresh, never shared and never cached.
  const key = tools.length === 0 ? promptKey(messages, systemPrompt) : null;
  const ttlSeconds = tools.length === 0 ? Math.min(Math.max(Number(options.cacheTtlSeconds) || 0, 0), CACHE_MAX_TTL_SECONDS) : 0;

  // 1) an answer kept from an earlier identical prompt (only when this call asked for the cache)
  if (key && ttlSeconds > 0) {
    const hit = await readCache(key);
    if (hit) {
      state.saved.cacheHits++;
      state.saved.tokens += hit.tokensUsed;
      console.log(
        `${tag} ✓ CACHE HIT (${hit.from}): no provider called, saved ~${fmt(hit.tokensUsed)} tokens and the wait. ` +
          `Answer from ${hit.provider}, ${agoText(Date.now() - hit.createdAt)} ago.`
      );
      return { text: hit.text, tokensUsed: 0, toolCalls: null };
    }
  }

  // 2) the same prompt is being answered right now: wait for that answer instead of paying for a second one
  if (key) {
    const running = state.inFlight.get(key);
    if (running) {
      console.log(`${tag} ⇢ SHARING the answer of ${running.tag}: same prompt, one provider call, no extra tokens.`);
      const shared = await running.promise;
      state.saved.shared++;
      state.saved.tokens += shared.result.tokensUsed;
      if (ttlSeconds > 0 && isStorable(shared.result, options.validate)) await writeCache(key, shared, ttlSeconds * 1000);
      return cloneResult(shared.result);
    }
  }

  // 3) ask the providers
  state.running++;
  const promise = runProviders(tag, messages, systemPrompt, tools);
  if (key) state.inFlight.set(key, { promise, tag });
  try {
    const outcome = await promise;
    if (key && ttlSeconds > 0 && isStorable(outcome.result, options.validate)) {
      await writeCache(key, outcome, ttlSeconds * 1000);
    }
    return outcome.result;
  } finally {
    state.running--;
    if (key) state.inFlight.delete(key);
  }
}

async function runProviders(
  tag: string,
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  tools: ToolDefinition[]
): Promise<RunOutcome> {
  const requestStartedAt = Date.now();
  let failedCount = 0; // providers tried (and failed) before the one that answered

  // Candidates are whatever actually has a key set in .env — a database row
  // is no longer required just to be *tried*. GEMINI/COHERE/ANTHROPIC read their own
  // env vars directly; everything else comes from OPENAI_COMPATIBLE_PROVIDERS.
  const candidateNames = KNOWN_PROVIDERS.filter((name) => keyFor(name));

  if (candidateNames.length === 0) {
    throw new Error("All LLM API providers are exhausted or failing.");
  }

  // DB rows are now an *overlay* for quota tracking, not a gate. A provider
  // with no row yet is treated as available; a row only excludes it if it's
  // explicitly inactive or already past its tracked limit. Rows are matched to
  // providers by name, ignoring case and spaces ("Gemini" is GEMINI, "Claude" is ANTHROPIC).
  // Only the five columns the router needs are read, never the whole row.
  const usageRows = await prisma.apiProvider.findMany({
    select: { id: true, name: true, isActive: true, requestsUsed: true, maxLimit: true },
  });
  const usageByName = matchProviderRows(usageRows);
  for (const [providerName, row] of usageByName) {
    if (row.name !== providerName && KNOWN_PROVIDERS.includes(providerName) && !state.rowNoticeShown.has(row.name)) {
      state.rowNoticeShown.add(row.name);
      console.log(
        `[LLM] ℹ ApiProvider row "${row.name}" is used for ${providerName} (names are matched ignoring case and spaces). ` +
          `Rename the row to ${providerName} to keep the names identical.`
      );
    }
  }

  const now = Date.now();
  const available = candidateNames.filter((name) => {
    if (activeCooldown(name, now)) return false;
    const row = usageByName.get(name);
    if (!row) return true;
    if (row.isActive === false) return false;
    return row.requestsUsed < row.maxLimit;
  });

  // Order: LLM_PROVIDER_ORDER if it is set, otherwise the fastest provider first.
  const size = describePromptSize(messages, systemPrompt, tools);
  const weight: PromptWeight = size.total >= HEAVY_PROMPT_TOKENS ? "heavy" : "light";
  checkOrderSettingOnce(candidateNames);
  const ordered = orderProviders(available, weight);

  // Repeat the reminder on every request until each broken provider is fixed.
  const stillBroken = [...needsFixing.entries()].filter(([name]) => candidateNames.includes(name));
  if (stillBroken.length > 0) {
    const list = stillBroken.map(([name, entry]) => `${name} (${entry.problem})`).join("  |  ");
    console.error(`${RED}⚠ STILL BROKEN, CHANGE NOW: ${list}${RESET}`);
  }

  console.log(
    `${tag} Request start — order: ${ordered.join(" → ") || "(none available)"}` +
      (state.running > 1 ? `  [${state.running} LLM requests running at the same time]` : "")
  );
  console.log(`${tag} ${size.text}`);
  if (size.total >= WARN_PROMPT_TOKENS) {
    console.warn(
      `${YELLOW}${tag} ⚠ BIG PROMPT (~${fmt(size.total)} tokens). Check what your app puts into it: repo files, README, file tree, chat history.${RESET}`
    );
  }
  if (AUTO_ORDER) {
    const learned = ordered.filter((name) => state.speedMs.has(speedKey(weight, name)));
    if (learned.length > 0) {
      console.log(
        `${tag} Speed learned (${weight} prompts): ${learned.map((name) => `${name} ${(expectedMs(name, weight) / 1000).toFixed(1)}s`).join(" | ")}`
      );
    }
  }

  for (const name of ordered) {
    const model = modelFor(name);
    const startedAt = Date.now();
    console.log(`${tag} → Trying ${name} (${model})`);

    try {
      let result: ProviderResult | null = null;

      if (name === "GEMINI") {
        result = await callGemini(messages, systemPrompt, process.env.GEMINI_API_KEY!);
      } else if (name === "COHERE") {
        result = await callCohere(messages, systemPrompt, process.env.COHERE_API_KEY!);
      } else if (name === "ANTHROPIC") {
        result = await callAnthropic(messages, systemPrompt, process.env.ANTHROPIC_API_KEY!, tools);
      } else {
        const config = OPENAI_COMPATIBLE_PROVIDERS[name];
        result = await callOpenAICompatible(name, config.url, config.model, messages, systemPrompt, config.apiKey!, tools);
      }

      if (result) {
        const tookMs = Date.now() - startedAt;
        recordSpeed(name, weight, tookMs);
        const split =
          result.inputTokens !== undefined || result.outputTokens !== undefined
            ? ` (in ${fmt(result.inputTokens ?? 0)} / out ${fmt(result.outputTokens ?? 0)})`
            : "";
        console.log(
          `${tag} ✓ USING ${name} (${model}) — ${tookMs}ms, ${fmt(result.tokensUsed)} tokens${split}` +
            (result.toolCalls ? `, ${result.toolCalls.length} tool call(s)` : "") +
            ` | whole request ${fmt(Date.now() - requestStartedAt)}ms, ${failedCount} failed before it`
        );
        needsFixing.delete(name); // it works again, stop reminding
        state.cooldown.delete(name);

        const row = usageByName.get(name);
        if (row) {
          const updated = await prisma.apiProvider.update({
            where: { id: row.id },
            data: { requestsUsed: { increment: 1 } },
          });
          const usagePercentage = updated.requestsUsed / updated.maxLimit;
          if (usagePercentage >= 0.8) {
            sendApiLimitAlert(updated.name, updated.requestsUsed, updated.maxLimit);
          }
        }
        return { result, provider: name };
      }

      failedCount++;
      console.warn(`${tag} ✗ ${name} gave no usable result after ${Date.now() - startedAt}ms, trying next...`);
    } catch (error) {
      failedCount++;
      const { code, message } = describeError(error);
      if (code && NETWORK_ERROR_CODES.has(code)) {
        setCooldown(name, NETWORK_COOLDOWN_MS, `Cannot reach the server (${code})`);
        if (code === "ENOTFOUND" || code === "ECONNREFUSED") {
          printFixBanner(name, `CANNOT REACH SERVER (${code})`, "Check the base URL, DNS and your internet", message);
        } else {
          console.warn(
            `${tag} ✗ ${name} network error (${code}) — skipping it for ${NETWORK_COOLDOWN_MS / 60000} min. ${message}`
          );
        }
      } else {
        console.warn(`${tag} ✗ ${name} failed: ${message}`);
      }
    }
  }

  console.error(
    `${RED}${tag} ✗ NO ANSWER after ${fmt(Date.now() - requestStartedAt)}ms: ` +
      (failedCount === 0
        ? "no provider was available (all are on cooldown, switched off in the database, or at their limit)."
        : `all ${failedCount} provider(s) tried failed.`) +
      RESET
  );
  throw new Error("All LLM API providers are exhausted or failing.");
}

export async function generateLLMResponse(
  messages: ChatMessage[],
  systemPrompt?: string,
  options?: LLMCallOptions
): Promise<ProviderResult> {
  return generateLLMResponseInternal(messages, systemPrompt, [], options);
}

export async function generateLLMResponseWithTools(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  tools: ToolDefinition[] = []
): Promise<AgenticLLMResponse> {
  const result = await generateLLMResponseInternal(messages, systemPrompt, tools);
  return {
    text: result.text,
    toolCalls: result.toolCalls,
  };
}

// 8. What the admin page may know (no keys, no URLs, no text written by a provider)
export type LLMProviderSnapshot = {
  name: string;
  label: string;
  model: string;
  /** Yes or no. The key itself never leaves this file. */
  keySet: boolean;
  envVar: string;
  modelEnvVar: string;
  /** The router has seen a failure that needs a human (the same words as the red banner in the terminal). */
  broken?: { problem: string; fix: string; since: number };
  /** The router is skipping this provider for now. */
  skip?: { until: number; reason: string };
};

export function getLLMProviderSnapshots(): LLMProviderSnapshot[] {
  const now = Date.now();
  return KNOWN_PROVIDERS.map((name) => {
    const broken = state.broken.get(name);
    const skip = activeCooldown(name, now);
    return {
      name,
      label: PROVIDER_LABELS[name] ?? name,
      model: modelFor(name),
      keySet: Boolean(keyFor(name)),
      envVar: ENV_VAR_BY_PROVIDER[name] ?? `${name}_API_KEY`,
      modelEnvVar: `${name}_MODEL`,
      ...(broken ? { broken: { ...broken } } : {}),
      ...(skip ? { skip: { ...skip } } : {}),
    };
  });
}

/** Requests the router did not have to send (the same prompt answered once, or kept in the cache) since this server started. */
export function getLLMSavings(): { since: number; shared: number; cacheHits: number; tokens: number } {
  return { ...state.saved };
}