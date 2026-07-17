import { prisma } from "@/lib/prisma";
import { sendApiLimitAlert } from "./emailAlert";

// 1. Configuration for the OpenAI-Compatible Providers
interface ProviderConfig {
  url: string;
  model: string;
  apiKey: string | undefined;
}

const OPENAI_COMPATIBLE_PROVIDERS: Record<string, ProviderConfig> = {
  GROQ: { url: "https://api.groq.com/openai/v1", model: "gpt-oss-20b", apiKey: process.env.GROQ_API_KEY },
  OPENROUTER: { url: "https://openrouter.ai/api/v1", model: "openai/gpt-oss-120b", apiKey: process.env.OPENROUTER_API_KEY },
  NVIDIA: { url: "https://integrate.api.nvidia.com/v1", model: "nvidia/nemotron-3-ultra-550b-a55b", apiKey: process.env.NVIDIA_API_KEY },
  DEEPSEEK: { url: "https://api.deepseek.com/v1", model: "deepseek-v4-flash", apiKey: process.env.DEEPSEEK_API_KEY },
  MISTRAL: { url: "https://api.mistral.ai/v1", model: "mistral-open-128b", apiKey: process.env.MISTRAL_API_KEY },
  SILICONFLOW: { url: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V4-Flash", apiKey: process.env.SILICONFLOW_API_KEY },
  HUGGINGFACE: { url: "https://api-inference.huggingface.co/v1", model: "meta-llama/Meta-Llama-3-8B-Instruct", apiKey: process.env.HUGGINGFACE_API_KEY },
  GITHUB_MODELS: { url: "https://models.inference.ai.azure.com", model: "DeepSeek-V4-Pro", apiKey: process.env.GITHUB_MODELS_KEY },
};

type ChatMessage = { role: string; content: string };
type ProviderResult = { text: string; tokensUsed: number };

function toOpenAIMessages(messages: ChatMessage[], systemPrompt?: string) {
  return systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages;
}

// 2. Universal API Call Wrapper (With Safety Guards)
async function callOpenAICompatible(
  url: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string
): Promise<ProviderResult | null> {
  if (!apiKey) return null; // Skip if key is empty

  const response = await fetch(`${url}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages: toOpenAIMessages(messages, systemPrompt) }),
  });

  if (!response.ok) return null; // Skip if API is down

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return null;
  return { text, tokensUsed: data?.usage?.total_tokens ?? 0 };
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) return null;

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return { text, tokensUsed: data?.usageMetadata?.totalTokenCount ?? 0 };
}

async function callCohere(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  apiKey: string
): Promise<ProviderResult | null> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const response = await fetch(`https://api.cohere.com/v1/chat`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "command-a-plus", message: lastUser?.content ?? "", preamble: systemPrompt }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  const text = data?.text;
  if (!text) return null;
  return { text, tokensUsed: 0 };
}

// --- Main Routing Engine ---
export async function generateLLMResponse(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ProviderResult> {
  // Candidates are whatever actually has a key set in .env — a database row
  // is no longer required just to be *tried*. GEMINI/COHERE read their own
  // env vars directly; everything else comes from OPENAI_COMPATIBLE_PROVIDERS.
  const candidateNames = [
    ...Object.keys(OPENAI_COMPATIBLE_PROVIDERS).filter((name) => OPENAI_COMPATIBLE_PROVIDERS[name].apiKey),
    ...(process.env.GEMINI_API_KEY ? ["GEMINI"] : []),
    ...(process.env.COHERE_API_KEY ? ["COHERE"] : []),
  ];

  if (candidateNames.length === 0) {
    throw new Error("All LLM API providers are exhausted or failing.");
  }

  // DB rows are now an *overlay* for quota tracking, not a gate. A provider
  // with no row yet is treated as available; a row only excludes it if it's
  // explicitly inactive or already past its tracked limit.
  const usageRows = await prisma.apiProvider.findMany({
    where: { name: { in: candidateNames } },
  });
  const usageByName = new Map(usageRows.map((r) => [r.name, r]));

  const available = candidateNames.filter((name) => {
    const row = usageByName.get(name);
    if (!row) return true;
    if (row.isActive === false) return false;
    return row.requestsUsed < row.maxLimit;
  });

  // Fisher-Yates in place of sort(() => Math.random() - 0.5), which doesn't
  // actually produce a uniform shuffle.
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  for (const name of available) {
    try {
      let result: ProviderResult | null = null;

      if (name === "GEMINI") {
        result = await callGemini(messages, systemPrompt, process.env.GEMINI_API_KEY!);
      } else if (name === "COHERE") {
        result = await callCohere(messages, systemPrompt, process.env.COHERE_API_KEY!);
      } else {
        const config = OPENAI_COMPATIBLE_PROVIDERS[name];
        result = await callOpenAICompatible(config.url, config.model, messages, systemPrompt, config.apiKey!);
      }

      if (result) {
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
        return result;
      }
    } catch {
      console.error(`Provider ${name} failed, jumping to next...`);
    }
  }

  throw new Error("All LLM API providers are exhausted or failing.");
}