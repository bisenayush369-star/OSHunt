"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { ADMIN_PATHS, type ApiError } from "@/components/lib/admin/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "id" | "password";

/** Talks to POST /api/admin/gate: step "id" sets the 5 minute gate cookie, step "password" starts the session. */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("id");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (step === "password" ? passwordRef : idRef).current?.focus();
  }, [step]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const value = step === "id" ? id.trim() : password;
    if (!value) {
      setError(step === "id" ? "Enter your admin ID." : "Enter your password.");
      setShaking(true);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(ADMIN_PATHS.api.gate, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(step === "id" ? { step, id: value } : { step, password: value }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiError | null;
        if (body?.error === "gate_expired") {
          setStep("id");
          setPassword("");
        }
        setError(body?.message ?? "Something went wrong. Try again.");
        setShaking(true);
        return;
      }

      if (step === "id") {
        setStep("password");
      } else {
        router.replace(ADMIN_PATHS.home);
        router.refresh();
      }
    } catch {
      setError("Cannot reach the server. Check your connection and try again.");
      setShaking(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="osa-login">
      <form
        className="osa-login-card"
        data-shake={shaking}
        onAnimationEnd={() => setShaking(false)}
        onSubmit={submit}
        noValidate
        aria-labelledby="osa-login-title"
      >
        <div className="osa-brand">
          <Image src="/white.png" alt="" width={28} height={28} priority />
          <span>OSHunt</span>
          <span className="osa-tag">Admin</span>
        </div>

        <div>
          <h1 id="osa-login-title">{step === "id" ? "Admin sign-in" : "Enter your password"}</h1>
          <p className="osa-sub">
            {step === "id" ? "Start with your admin ID." : "One more step. This session lasts a few hours."}
          </p>
        </div>

        {step === "id" ? (
          <div className="osa-field">
            <label className="osa-label" htmlFor="osa-id">
              Admin ID
            </label>
            <Input
              ref={idRef}
              id="osa-id"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={id}
              onChange={(e) => setId(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "osa-login-error" : undefined}
            />
          </div>
        ) : (
          <div className="osa-field">
            {/* Lets password managers pair the saved username with this password. */}
            <input className="osa-sr" tabIndex={-1} aria-hidden="true" readOnly name="username" autoComplete="username" value={id} />
            <div className="osa-idrow">
              <span className="osa-muted">Admin ID</span>
              <b className="osa-mono">{id}</b>
              <button
                type="button"
                className="osa-link"
                onClick={() => {
                  setStep("id");
                  setPassword("");
                  setError(null);
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Change
              </button>
            </div>
            <label className="osa-label" htmlFor="osa-password">
              Password
            </label>
            <div className="osa-pw">
              <Input
                ref={passwordRef}
                id="osa-password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "osa-login-error" : undefined}
              />
              <button
                type="button"
                className="osa-iconbtn"
                aria-pressed={show}
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow((s) => !s)}
              >
                {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        )}

        {error ? (
          <p id="osa-login-error" className="osa-form-error" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="osa-btn osa-btn-wide" disabled={busy}>
          {busy ? <Loader2 className="osa-spin" size={18} aria-hidden="true" /> : null}
          {busy ? "Checking" : step === "id" ? "Continue" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
