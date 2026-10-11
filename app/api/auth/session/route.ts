import { auth } from "@/components/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    return new Response(JSON.stringify(session ?? null), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("[auth/session] Session lookup failed; returning unauthenticated session.", err);
    return new Response(JSON.stringify(null), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
