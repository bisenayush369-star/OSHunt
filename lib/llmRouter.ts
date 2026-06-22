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

// 2. Universal API Call Wrapper (With Safety Guards)
async function callOpenAICompatible(url: string, model: string, prompt: string, apiKey: string) {
  if (!apiKey || apiKey === "") return null; // Skip if key is empty
  
  const response = await fetch(`${url}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }] }),
  });
  
  if (!response.ok) return null; // Skip if API is down
  
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

// 3. Custom Native Handlers (Gemini & Cohere)
async function callGemini(prompt: string, apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callCohere(prompt: string, apiKey: string) {
  const response = await fetch(`https://api.cohere.com/v1/chat`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "command-a-plus", message: prompt }),
  });
  const data = await response.json();
  return data?.text || null;
}

// --- Main Routing Engine ---
// --- Main Routing Engine ---
export async function generateLLMResponse(prompt: string): Promise<string> {
  // 1. Fetch all active providers from your Neon Database
  const allProviders = await prisma.apiProvider.findMany({
    where: { isActive: true },
  });

  // 2. Filter out any models that have already hit their limits
  const availableProviders = allProviders.filter(
    (provider) => provider.requestsUsed < provider.maxLimit
  );

  // 3. Shuffle the deck! This randomizes the array order instantly
  const shuffledProviders = availableProviders.sort(() => Math.random() - 0.5);

  // 4. Loop through the randomized list of available models
  for (const provider of shuffledProviders) {

    try {
      let result = null;

      // Route to custom handlers or the universal wrapper
      if (provider.name === "GEMINI" && process.env.GEMINI_API_KEY) {
        result = await callGemini(prompt, process.env.GEMINI_API_KEY);
      } else if (provider.name === "COHERE" && process.env.COHERE_API_KEY) {
        result = await callCohere(prompt, process.env.COHERE_API_KEY);
      } else {
        const config = OPENAI_COMPATIBLE_PROVIDERS[provider.name];
        if (config && config.apiKey) {
          result = await callOpenAICompatible(config.url, config.model, prompt, config.apiKey);
        }
      }

      // If successful, track the usage and check 80% limit for Email Alert
      if (result) {
        const updatedProvider = await prisma.apiProvider.update({
          where: { id: provider.id },
          data: { requestsUsed: { increment: 1 } },
        });

        // EMAIL ALERT LOGIC: Trigger at 80% usage
        const usagePercentage = updatedProvider.requestsUsed / updatedProvider.maxLimit;
        if (usagePercentage >= 0.80) {
          sendApiLimitAlert(updatedProvider.name, updatedProvider.requestsUsed, updatedProvider.maxLimit);
        }

        return result; 
      }
    } catch (error) {
      console.error(`Provider ${provider.name} failed, jumping to next...`);
    }
  }

  throw new Error("All LLM API providers are exhausted or failing.");
}