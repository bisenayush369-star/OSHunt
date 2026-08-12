import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { GitHubAccountAlreadyLinkedError, upsertGitHubConnection } from "@/lib/github-connection";

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gh_oauth_state")?.value;
  const returnTo = cookieStore.get("gh_oauth_return_to")?.value || "/dashboard";
  const popupMode = cookieStore.get("gh_oauth_popup")?.value === "1";
  cookieStore.delete("gh_oauth_state");
  cookieStore.delete("gh_oauth_return_to");
  cookieStore.delete("gh_oauth_popup");

  const failUrl = buildConnectRedirectUrl(request, returnTo, "failed");

  if (!session?.user?.id || errorParam || !code || !returnedState || returnedState !== expectedState) {
    const redirectUrl = buildConnectRedirectUrl(
      request,
      returnTo,
      errorParam === "access_denied" || errorParam === "user_denied" ? "cancelled" : "failed"
    );
    if (popupMode) {
      return buildPopupResponse(redirectUrl.toString(), false);
    }
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const clientId = process.env.GITHUB_CONNECT_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CONNECT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      if (popupMode) {
        return buildPopupResponse(failUrl.toString(), false);
      }
      return NextResponse.redirect(failUrl);
    }

    const callbackUrl = process.env.GITHUB_CONNECT_REDIRECT_URI || new URL("/api/github/callback", request.url).toString();
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      if (popupMode) {
        return buildPopupResponse(failUrl.toString(), false);
      }
      return NextResponse.redirect(failUrl);
    }

    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!profileRes.ok) {
      if (popupMode) {
        return buildPopupResponse(failUrl.toString(), false);
      }
      return NextResponse.redirect(failUrl);
    }
    const profile = await profileRes.json();

    await upsertGitHubConnection({
      userId: session.user.id,
      githubUserId: String(profile.id),
      username: profile.login,
      avatarUrl: profile.avatar_url,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      scopes: (tokenData.scope || "").split(",").filter(Boolean),
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
    });

    if (popupMode) {
      return buildPopupResponse(new URL(returnTo, request.url).toString(), true);
    }
    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (err) {
    console.error("[github/callback]", err);
    const redirectUrl = buildConnectRedirectUrl(
      request,
      returnTo,
      err instanceof GitHubAccountAlreadyLinkedError ? "already-linked" : "failed"
    );
    if (popupMode) {
      return buildPopupResponse(redirectUrl.toString(), false);
    }
    return NextResponse.redirect(redirectUrl);
  }
}

function buildConnectRedirectUrl(request: NextRequest, returnTo: string, error?: string) {
  const url = new URL("/connect-github", request.url);
  if (returnTo) {
    url.searchParams.set("from", returnTo);
  }
  if (error) {
    url.searchParams.set("error", error);
  }
  return url;
}

function buildPopupResponse(targetUrl: string, success: boolean) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GitHub connect</title>
  </head>
  <body>
    <script>
      const target = ${JSON.stringify(targetUrl)};
      const opener = window.opener;
      if (opener) {
        try {
          opener.postMessage({ type: ${JSON.stringify(success ? "github-connect-success" : "github-connect-error")}, targetUrl: target }, window.location.origin);
          opener.location.href = target;
          opener.location.reload();
        } catch (error) {
          console.error(error);
        }
      }
      window.close();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
