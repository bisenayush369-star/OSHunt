import type { NextRequest } from "next/server";
import type { LlmResponse } from "@/components/lib/admin/contract";
import { fail, json, requireAdmin } from "@/components/lib/admin/guard";
import { loadLlmSection } from "@/components/lib/admin/llm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/llm  ->  LlmResponse. Never contains a key, a URL or text written by a provider. */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    return json<LlmResponse>({ llm: await loadLlmSection(), updatedAt: Date.now() });
  } catch (error) {
    console.error("[admin-llm] failed", error);
    return fail(500, "llm_failed", "Could not read the LLM status.");
  }
}
