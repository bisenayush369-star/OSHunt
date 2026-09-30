"use client"

import { useState } from "react"
import Link from "next/link"

export default function Demo() {
  const [email, setEmail] = useState("")

  return (
    <main className="min-h-screen bg-[#090909] text-[#efefef]" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111111] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#a8ff3e] text-sm font-bold text-[#090909]">O</div>
            <span className="text-lg font-semibold">OSHunt</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Let’s talk</h1>
          <p className="mt-3 text-sm leading-6 text-[#888]">
            Use this page for support, partnerships, or product questions. The app is now using the sign-in flow instead.
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#7d7d7d]">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="hello@oshunt.io"
                className="w-full rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-[#efefef] outline-none placeholder:text-[#555] focus:border-[#a8ff3e]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#7d7d7d]">Message</label>
              <textarea
                rows={5}
                placeholder="Tell us what you need..."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-[#efefef] outline-none placeholder:text-[#555] focus:border-[#a8ff3e]"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-[#a8ff3e] px-4 py-3 font-semibold text-[#090909] transition hover:opacity-90"
            >
              Send message
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[#666]">
            Need to sign in instead? <Link href="/login" className="text-[#a8ff3e] underline">Go to sign in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
