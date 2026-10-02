"use client";
import "../admin.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EASE } from "@/components/admin/charts";

export default function AdminLogin() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.get("id"), password: f.get("password") }),
    });
    if (r.ok) return router.replace("/admin");
    if (r.status === 404) return router.replace("/");
    setErr((await r.json().catch(() => null))?.error ?? "Sign-in failed.");
    setBusy(false);
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="adm-scope adm adm-center">
        <div className="adm-bg" aria-hidden />
        <motion.form className="adm-login" onSubmit={submit} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <Image src="/white.png" alt="OSHunt" width={36} height={36} className="adm-logo-img" />
          <span className="adm-label lime">Owner access</span>
          <h1>Private area</h1>
          <p className="adm-muted">Enter your admin ID and password.</p>
          <label>ID<Input className="adm-input plain" name="id" autoComplete="username" required autoFocus /></label>
          <label>Password<Input className="adm-input plain" name="password" type="password" autoComplete="current-password" required /></label>
          {err && <p className="adm-err" role="alert">{err}</p>}
          <Button className="adm-btn" disabled={busy}>{busy ? "Checking..." : "Sign in"}</Button>
        </motion.form>
      </main>
    </MotionConfig>
  );
}

