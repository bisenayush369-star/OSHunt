"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TriangleAlert, Loader2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "GitHub/Google sign-in is not configured in this environment. Add the OAuth keys to .env.local and restart the app.",
  OAuthAccountNotLinked:
    "That email is already linked to a different sign-in method. Try the provider you originally used.",
  AccessDenied: "Access was denied during sign-in. You're welcome to try again anytime.",
  OAuthSignin: "Something went wrong starting the sign-in flow. Please try again.",
  OAuthCallback: "Something went wrong completing sign-in. Please try again.",
  Default: "Something went wrong signing you in. Please try again.",
};

type Provider = "github" | "google";

function getSafeCallbackUrl(rawUrl: string | null) {
  if (!rawUrl) return "/";

  let normalized = rawUrl;

  try {
    normalized = decodeURIComponent(rawUrl);
  } catch {
    normalized = rawUrl;
  }

  if (!normalized.startsWith("/")) return "/";

  try {
    const parsed = new URL(normalized, "http://localhost");
    const nestedCallback = parsed.searchParams.get("callbackUrl");

    if (["/login", "/signin", "/onboarding", "/api/auth/signin"].includes(parsed.pathname)) {
      if (nestedCallback) {
        return getSafeCallbackUrl(nestedCallback);
      }
      return "/";
    }

    if (nestedCallback && parsed.pathname === "/") {
      return getSafeCallbackUrl(nestedCallback);
    }
  } catch {
    // ignore malformed URLs
  }

  if (normalized === "/login" || normalized === "/signin" || normalized === "/onboarding") return "/";
  if (normalized.startsWith("/api/auth/signin?")) {
    try {
      const parsed = new URL(normalized, "http://localhost");
      const nestedCallback = parsed.searchParams.get("callbackUrl");
      if (nestedCallback) return getSafeCallbackUrl(nestedCallback);
    } catch {
      // ignore malformed URLs
    }
    return "/";
  }

  // If the current path is an auth page but carries a real callback target,
  // preserve the destination instead of bouncing back to /login or /
  if (normalized.startsWith("/login?") || normalized.startsWith("/signin?") || normalized.startsWith("/onboarding?")) {
    try {
      const parsed = new URL(normalized, "http://localhost");
      const nestedCallback = parsed.searchParams.get("callbackUrl");
      if (nestedCallback) return getSafeCallbackUrl(nestedCallback);
    } catch {
      // ignore malformed URLs
    }
    return "/";
  }

  return normalized;
}

function LoginCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default : null;
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    if (status !== "authenticated") return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath === callbackUrl || currentPath === "/login") {
      router.replace(callbackUrl);
      return;
    }

    if (callbackUrl && callbackUrl !== "/") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  async function handleSignIn(provider: Provider) {
    if (loadingProvider) return;

    setLoadingProvider(provider);

    try {
      await signIn(provider, {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Sign-in failed", error);
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <Card className="relative z-10 w-full max-w-[420px] overflow-hidden border-white/8 bg-[#0f0f0f]/60 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[20px]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a8ff3e80] to-transparent" />

      <CardContent className="p-8 sm:p-12">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="OSHunt logo"
            width={180}
            height={54}
            priority
            style={{ width: "180px", height: "54px", objectFit: "contain" }}
          />
        </div>

        <h1 className="text-center text-[28px] font-bold tracking-[-0.5px] text-white">Welcome back</h1>
        <p className="mx-auto mb-8 mt-2 max-w-[300px] text-center text-sm leading-relaxed text-[#888]">
          Sign in to pick up where you left off — your saved stack and contribution history are waiting.
        </p>

        {errorMessage && (
          <Alert
            variant="destructive"
            className="mb-6 border-red-900/50 bg-red-950/30 text-red-200 [&>svg]:text-red-300"
          >
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription className="text-[13px] text-red-200/90">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={() => handleSignIn("github")}
          disabled={loadingProvider !== null}
          className="mb-4 h-auto w-full justify-center gap-3 rounded-xl bg-[#efefef] py-3.5 text-[15px] font-semibold text-[#090909] transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_20px_rgba(255,255,255,0.1)] disabled:opacity-60"
        >
          {loadingProvider === "github" ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Image src="/github.svg" alt="" width={18} height={18} />
          )}
          {loadingProvider === "github" ? "Redirecting..." : "Continue with GitHub"}
        </Button>

        <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-wider text-[#555]">
          <span className="h-px flex-1 bg-white/10" />
          Or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <Button
          onClick={() => handleSignIn("google")}
          disabled={loadingProvider !== null}
          variant="outline"
          className="h-auto w-full justify-center gap-3 rounded-xl border-white/10 bg-white/[0.03] py-3.5 text-[15px] font-semibold tracking-[-0.2px] text-[#d0d0d0] transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/8 disabled:opacity-60"
        >
          {loadingProvider === "google" ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Image src="/google.svg" alt="" width={18} height={18} />
          )}
          {loadingProvider === "google" ? "Redirecting..." : "Continue with Google"}
        </Button>

        <p className="mt-8 text-center text-xs leading-relaxed text-[#666]">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-[#a8ff3e] no-underline hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#a8ff3e] no-underline hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-xs text-[#555]">
          New here?{" "}
          <Link href="/signup" className="text-[#a8ff3e] no-underline hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-10 text-white sm:px-6"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(30px, 50px) scale(1.1); } }
      `}</style>

      <div
        className="pointer-events-none absolute -left-[100px] -top-[100px] h-[400px] w-[400px] rounded-full opacity-40 blur-[80px]"
        style={{ background: "#a8ff3e", animation: "float 10s ease-in-out infinite alternate" }}
      />
      <div
        className="pointer-events-none absolute -bottom-[50px] -right-[50px] h-[300px] w-[300px] rounded-full opacity-40 blur-[80px]"
        style={{ background: "#2a2a2a", animation: "float 10s ease-in-out infinite alternate", animationDelay: "-5s" }}
      />

      {/* useSearchParams() requires a Suspense boundary in the App Router */}
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}