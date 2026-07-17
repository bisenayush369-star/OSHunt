"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TriangleAlert, Loader2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already linked to a different sign-in method. Try the provider you originally used.",
  AccessDenied: "Access was denied during sign-in. You're welcome to try again anytime.",
  OAuthSignin: "Something went wrong starting the sign-in flow. Please try again.",
  OAuthCallback: "Something went wrong completing sign-in. Please try again.",
  Default: "Something went wrong signing you in. Please try again.",
};

type Provider = "github" | "google";

function LoginCard() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default : null;
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

  function handleSignIn(provider: Provider) {
    setLoadingProvider(provider);
    signIn(provider, { callbackUrl: "/hunt" });
  }

  return (
    <Card className="relative z-10 w-full max-w-[420px] overflow-hidden border-white/8 bg-[#0f0f0f]/60 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[20px]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a8ff3e80] to-transparent" />

      <CardContent className="p-8 sm:p-12">
        <div className="mb-8 flex justify-center">
          <svg width="42" height="42" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="15" stroke="#a8ff3e" strokeWidth="1.2" />
            <circle cx="18" cy="18" r="4" stroke="#a8ff3e" strokeWidth="0.7" opacity="0.4" />
            <line x1="18" y1="2" x2="18" y2="0" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="18" y1="34" x2="18" y2="36" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="2" y1="18" x2="0" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="34" y1="18" x2="36" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="18" cy="18" r="1.8" fill="#a8ff3e" />
          </svg>
        </div>

        <h1 className="text-center text-[28px] font-bold tracking-[-0.5px] text-white">Access OSHunt</h1>
        <p className="mx-auto mb-8 mt-2 max-w-[300px] text-center text-sm leading-relaxed text-[#888]">
          Connect your account to start hunting issues and building your open-source legacy.
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