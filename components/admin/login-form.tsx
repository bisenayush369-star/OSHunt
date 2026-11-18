"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Heart } from "lucide-react";
import { ADMIN_PATHS, GATE_ERRORS, type GateRequest, type GateResponse } from "@/components/lib/admin/contract";
import { AdminApiError, adminFetch } from "./api";
import { Button, Field, Input, Notice } from "./kit";
import { AdminRoot } from "./scope";

/**
 * The second step of the only way in: the heart sets a 10-minute cookie, this form trades an ID and a password
 * for the 2-hour session. Every wrong answer reads the same, and neither field is ever echoed back.
 *
 * The inputs are uncontrolled and read from the form on submit. A password manager that fills the fields before
 * React has hydrated, or a fast typist, therefore never ends up with a filled-looking form that React thinks is
 * empty. `method="post"` means that a submit before hydration still cannot put the password in the URL.
 */
export function LoginForm() {
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<{ code: string; message: string } | null>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const body: GateRequest = { step: "login", id: String(data.get("username") ?? "").trim(), password: String(data.get("password") ?? "") };
    if (!body.id || !body.password) {
      setProblem({ code: GATE_ERRORS.badRequest, message: "Enter your ID and password." });
      return;
    }

    setBusy(true);
    setProblem(null);
    try {
      await adminFetch<GateResponse>(ADMIN_PATHS.api.gate, { method: "POST", body: JSON.stringify(body) });
      // A full page load, so the server sees the new cookie before it renders /admin.
      window.location.assign(ADMIN_PATHS.home);
    } catch (error) {
      const known = error instanceof AdminApiError ? error : null;
      setProblem({ code: known?.code ?? "error", message: known?.message ?? "Something went wrong. Try again." });
      if (passwordRef.current) {
        passwordRef.current.value = "";
        passwordRef.current.focus();
      }
      setBusy(false);
    }
  };

  const wrong = problem?.code === GATE_ERRORS.invalid ? true : undefined;
  const expired = problem?.code === GATE_ERRORS.noKnock;

  return (
    <AdminRoot>
      <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="w-full max-w-[380px]">
          <div className="osa-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 flex-none place-items-center rounded-full border border-[var(--osa-lime-line)] bg-[var(--osa-lime-soft)]">
                <Heart className="size-4 text-[var(--osa-lime)]" fill="currentColor" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="text-[18px] font-semibold leading-tight">Owner sign-in</h1>
                <p className="osa-prompt mt-1 text-[12px]">osh auth --owner</p>
              </div>
            </div>

            <form method="post" action={ADMIN_PATHS.login} onSubmit={submit} className="grid gap-4">
              <Field label="ID">
                {(f) => <Input {...f} name="username" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required aria-invalid={wrong} />}
              </Field>
              <Field label="Password">
                {(f) => (
                  <div className="relative">
                    <Input {...f} ref={passwordRef} name="password" type={show ? "text" : "password"} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} required className="pr-12" aria-invalid={wrong} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                )}
              </Field>

              {problem ? (
                <Notice
                  tone="bad"
                  title={problem.message}
                  action={
                    expired ? (
                      <Link href="/" prefetch={false} className="osa-btn osa-btn--sm">
                        Back to OSHunt
                      </Link>
                    ) : undefined
                  }
                />
              ) : null}

              <Button type="submit" variant="primary" loading={busy} className="w-full">
                Sign in
              </Button>
            </form>
          </div>
          <p className="osa-faint mt-4 text-center text-[12px]">Sessions last 2 hours.</p>
        </div>
      </main>
    </AdminRoot>
  );
}
