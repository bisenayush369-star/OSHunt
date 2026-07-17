import type { Metadata } from "next";
import Link from "next/link";
import { CircleDollarSign, CircleSlash, CalendarClock, Scale, Mail, ArrowLeft, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Refund Policy | OSHunt",
  description:
    "How refunds work for OSHunt — currently free during our open beta, with clear terms for when paid plans launch.",
};

function Highlight({
  Icon,
  title,
  accent,
  delay,
  children,
}: {
  Icon: typeof CircleDollarSign;
  title: string;
  accent: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="group animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden border-[#1a1a1a] bg-[#0d0d0d] transition-all duration-300 hover:-translate-y-1.5"
      style={{ animationDelay: `${delay}ms`, animationDuration: "450ms", animationFillMode: "both" }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 30% 0%, ${accent}1a, transparent 70%)` }}
      />
      <CardContent className="relative z-10 p-6">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border"
          style={{ backgroundColor: `${accent}14`, borderColor: `${accent}30`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-[#e8e8e8]">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#666]">{children}</p>
      </CardContent>
    </Card>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3.5">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#a8ff3e40] bg-[#a8ff3e14] font-mono text-[13px] font-bold text-[#a8ff3e] shadow-[0_0_16px_rgba(168,255,62,0.15)]">
          {number}
        </span>
        <h2 className="text-lg font-bold tracking-[-0.02em] text-[#e8e8e8] sm:text-xl">{title}</h2>
      </div>
      <div className="space-y-3 pl-[46px] text-sm leading-[1.8] text-[#777]">{children}</div>
      <Separator className="mt-2 bg-[#1a1a1a]" />
    </section>
  );
}

export default function RefundPolicyPage() {
  const lastUpdated = "July 15, 2026";
  const supportEmail = "hello@oshunt.io";
  const legalEmail = "legal@oshunt.io";

  return (
    <main className="min-h-screen bg-[#090909] text-white antialiased" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Breadcrumb */}
      <div className="border-b border-[#1a1a1a] bg-[#0d0d0d]/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1060px] items-center justify-between px-4 py-4 text-xs text-[#555] sm:px-6 sm:text-sm">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-medium text-[#999] transition-colors hover:text-white">
              OSHunt
            </Link>
            <span className="text-[#2a2a2a]">/</span>
            <span className="hidden sm:inline">Legal</span>
            <span className="hidden text-[#2a2a2a] sm:inline">/</span>
            <span className="font-medium text-[#ccc]">Refund Policy</span>
          </div>
          <span className="hidden sm:inline">Updated: {lastUpdated}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#1a1a1a] py-16 text-center sm:py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff07 1px, transparent 1px), radial-gradient(ellipse 60% 50% at 50% 0%, #a8ff3e17 0%, transparent 70%)",
            backgroundSize: "26px 26px, 100% 100%",
            WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)",
          }}
        />

        {/* Brand watermark — the same reticle motif used on the Hunt page, large and faint */}
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 opacity-[0.05] sm:h-[420px] sm:w-[420px]"
        >
          <path d="M18 3 L31 10.5 V25.5 L18 33 L5 25.5 V10.5 Z" stroke="#a8ff3e" strokeWidth="0.4" strokeDasharray="2 3" />
          <path d="M18 11 L25 18 L18 25 L11 18 Z" stroke="#a8ff3e" strokeWidth="0.8" />
          <circle cx="18" cy="18" r="2.5" fill="#a8ff3e" />
          <circle cx="18" cy="18" r="6.5" stroke="#a8ff3e" strokeWidth="0.5" strokeDasharray="1 3" />
        </svg>

        <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-[10.5px] uppercase tracking-[0.09em] text-[#555]">
            <Scale className="h-3 w-3" />
            Legal
          </p>
          <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-[36px] font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Refund Policy
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#888] sm:text-base">
            OSHunt is currently free to use during our open beta. This page explains where things stand today, and
            how refunds will work if and when paid plans launch.
          </p>
        </div>
      </section>

      {/* TL;DR banner */}
      <section className="mx-auto -mt-px max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-[#a8ff3e30] bg-gradient-to-r from-[#a8ff3e0f] via-[#0d0d0d] to-[#0d0d0d] px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a8ff3e30] bg-[#a8ff3e14] text-[#a8ff3e]">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <p className="text-[13.5px] leading-relaxed text-[#ccc] sm:text-sm">
              <span className="font-bold text-[#a8ff3e]">TL;DR —</span> OSHunt is free right now, so there&apos;s
              nothing to refund. When that changes, you&apos;ll know before you&apos;re ever charged.
            </p>
          </div>
        </div>
      </section>

      {/* Quick glance */}
      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          <Highlight Icon={CircleDollarSign} title="Free During Beta" accent="#a8ff3e" delay={0}>
            OSHunt&apos;s core features don&apos;t cost anything right now. There&apos;s no purchase to make, so
            there&apos;s nothing to refund.
          </Highlight>
          <Highlight Icon={CircleSlash} title="No Charges, No Refunds" accent="#61dafb" delay={80}>
            Without a paid plan in place, we&apos;re not processing any payments — so a traditional refund process
            doesn&apos;t apply yet.
          </Highlight>
          <Highlight Icon={CalendarClock} title="Paid Plans Are Coming" accent="#8b8cf9" delay={160}>
            When we introduce paid plans, we&apos;ll publish clear refund terms here before any charges begin.
          </Highlight>
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#1a1a1a] bg-[#0d0d0d] p-6 sm:p-10 md:p-12">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a8ff3e50] to-transparent" />

          <div className="space-y-8 sm:space-y-10">
            <Section number={1} title="Current Pricing">
              <p>
                OSHunt&apos;s Issue Hunter and GitLense tools are free to use for individual contributors during
                this open beta period, as described in our{" "}
                <Link href="/terms" className="border-b border-[#a8ff3e44] text-[#a8ff3e] no-underline">
                  Terms of Service
                </Link>
                . We&apos;re not currently charging for access, and no payment information is collected to use the
                core product.
              </p>
            </Section>

            <Section number={2} title="Future Paid Plans">
              <p>
                We plan to introduce paid plans in the future for teams or advanced features. When we do, pricing
                and any applicable refund terms will be presented clearly before you&apos;re ever charged, and
                we&apos;ll update this policy ahead of launch to reflect them.
              </p>
            </Section>

            <Section number={3} title="If You Were Charged in Error">
              <p>
                If you ever notice a charge from OSHunt that you don&apos;t recognize or believe was made in
                error, contact us right away. We&apos;ll look into it, and where a charge shouldn&apos;t have
                happened, we&apos;ll reverse it.
              </p>
              <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200/90">
                <strong className="text-amber-100">Think you were charged incorrectly?</strong> Email us at{" "}
                <a href={`mailto:${supportEmail}`} className="font-bold underline underline-offset-2">
                  {supportEmail}
                </a>{" "}
                with as much detail as you can — we aim to respond within 24 hours.
              </div>
            </Section>

            <Section number={4} title="Cancelling Your Account">
              <p>Because OSHunt is free, there&apos;s no subscription to cancel today. At any point, you can:</p>
              <ul className="list-none space-y-2">
                {[
                  "Stop using OSHunt whenever you like — nothing to cancel, no charges to stop.",
                  "Revoke GitHub OAuth access anytime from your GitHub account settings.",
                  "Request full account deletion by emailing us, as described in our Terms of Service.",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#a8ff3e]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section number={5} title="Your Rights">
              <p>
                Nothing in this policy limits any rights you have under applicable consumer protection law. Where
                local law grants you a right that conflicts with something written here, the law prevails.
              </p>
            </Section>

            <Section number={6} title="Changes to This Policy">
              <p>
                We&apos;ll update this page as our pricing changes. When we do, we&apos;ll revise the &quot;Last
                updated&quot; date above, and for material changes — like the introduction of paid plans —
                we&apos;ll make a reasonable effort to notify users in advance.
              </p>
            </Section>

            <section className="space-y-3">
              <div className="flex items-center gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#a8ff3e40] bg-[#a8ff3e14] font-mono text-[13px] font-bold text-[#a8ff3e] shadow-[0_0_16px_rgba(168,255,62,0.15)]">
                  7
                </span>
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[#e8e8e8] sm:text-xl">Contact</h2>
              </div>
              <div className="space-y-3 pl-[46px] text-sm leading-[1.8] text-[#777]">
                <p>
                  Questions about this policy or a billing concern? Reach us at{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="border-b border-[#a8ff3e44] text-[#a8ff3e] no-underline"
                  >
                    {supportEmail}
                  </a>
                  . For anything related to our Terms of Service, use{" "}
                  <a
                    href={`mailto:${legalEmail}`}
                    className="border-b border-[#a8ff3e44] text-[#a8ff3e] no-underline"
                  >
                    {legalEmail}
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* Support banner */}
            <section className="relative overflow-hidden rounded-2xl border border-[#1a1a1a] bg-black/40 p-6 sm:p-8 md:p-10">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
                style={{ background: "#a8ff3e" }}
              />
              <div className="relative max-w-2xl">
                <h3 className="text-xl font-bold tracking-tight text-[#e8e8e8] sm:text-2xl">
                  Have a billing question?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#666]">
                  We&apos;re a small team, so questions come straight to us — no ticket queue in between.
                </p>
                <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Button
                    asChild
                    className="w-full rounded-xl bg-[#a8ff3e] px-6 font-semibold text-black shadow-[0_0_24px_rgba(168,255,62,0.25)] transition-transform hover:scale-[1.02] hover:bg-[#bdff66] sm:w-auto"
                  >
                    <a href={`mailto:${supportEmail}`}>
                      <Mail className="h-4 w-4" />
                      Email {supportEmail}
                    </a>
                  </Button>
                  <span className="text-xs text-[#555]">Typical response time: under 24 hours</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 text-sm text-[#555] sm:flex-row">
          <Link href="/" className="flex items-center gap-1.5 font-medium transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to OSHunt Homepage
          </Link>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}