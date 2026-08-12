import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const { searchParams } = new URL(request.url);
  const rawFrom = searchParams.get("from") || "/dashboard";
  const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/dashboard";
  const popupMode = searchParams.get("popup") === "1";

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("gh_oauth_return_to", from, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("gh_oauth_popup", popupMode ? "1" : "0", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const clientId = process.env.GITHUB_CONNECT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub connect OAuth client ID is not configured" }, { status: 500 });
  }

  const callbackUrl = process.env.GITHUB_CONNECT_REDIRECT_URI || new URL("/api/github/callback", request.url).toString();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl.toString());
}
