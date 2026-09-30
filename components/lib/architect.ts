// Shared by every OSHunt persona route (God Mode, Bounty Strategist, etc).
// Each route supplies its own system prompt; the API call, history cap, and
// error shape live here so they don't drift between routes as you add more.

const MODEL = "claude-sonnet-4-6"
const MAX_HISTORY_MESSAGES = 20
const MAX_TOKENS = 2048

export type ApiMessage = { role: "user" | "assistant"; content: string }

export class PersonaError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function callArchitect(systemPrompt: string, messages: ApiMessage[], maxTokens: number = MAX_TOKENS) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new PersonaError("`messages` is required and must be non-empty.", 400)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new PersonaError("ANTHROPIC_API_KEY is not set on the server.", 500)
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      // Caps forwarded history so a long terminal session can't silently
      // inflate cost per call — same fix as the God Mode route, now in one place.
      messages: messages.slice(-MAX_HISTORY_MESSAGES),
    }),
  })

  if (!res.ok) {
    const detailText = await res.text()
    let friendly = `Architect call failed: ${detailText}`
    try {
      const parsed = JSON.parse(detailText)
      // Anthropic error shape sometimes is { type: 'error', error: { type: 'authentication_error', message: '...' }, request_id }
      const errType = parsed?.error?.type ?? parsed?.type
      const errMsg = parsed?.error?.message ?? parsed?.message
      if (errType === "authentication_error" || (typeof errMsg === "string" && errMsg.toLowerCase().includes("invalid x-api-key"))) {
        friendly =
          "AI authentication failed: invalid or missing ANTHROPIC_API_KEY.\n" +
          "Set a valid `ANTHROPIC_API_KEY` in your environment (do not commit it)."
      } else if (errMsg) {
        friendly = `Architect call failed: ${errMsg}`
      }
    } catch {
      // ignore JSON parse errors and keep raw text
    }
    throw new PersonaError(friendly, 502)
  }

  const data = await res.json()
  type ContentBlock = { type: string; text?: string }
  const text = (data.content ?? [])
    .filter((block: ContentBlock) => block.type === "text")
    .map((block: ContentBlock) => block.text ?? "")
    .join("\n")
  const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)

  return { text, tokensUsed }
}
