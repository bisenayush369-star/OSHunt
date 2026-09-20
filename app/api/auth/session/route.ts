import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const body = JSON.stringify(session ?? null);
    return new Response(body, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("[auth/session] Session lookup failed:", err);
    return new Response(JSON.stringify({ error: "session_lookup_failed" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
