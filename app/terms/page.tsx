"use client";

import { useState, useEffect, type ReactNode } from "react";
import Navbar from "@/components/ui/HomeNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT = "#a8ff3e";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "service", title: "Description of Service" },
  { id: "accounts", title: "User Accounts" },
  { id: "acceptable", title: "Acceptable Use" },
  { id: "ip", title: "Intellectual Property" },
  { id: "third-party", title: "Third-Party Services" },
  { id: "privacy", title: "Privacy & Data" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact" },
];

function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm leading-[1.85] text-[#777]">{children}</p>;
}

function Section({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-14">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="h-[22px] w-[3px] shrink-0 rounded-sm" style={{ backgroundColor: ACCENT }} />
        <h2 className="text-lg font-bold tracking-[-0.02em] text-[#e8e8e8]">{title}</h2>
      </div>
      {children}
      <div className="mt-4 border-b border-[#1a1a1a]" />
    </div>
  );
}

export default function TermsPage() {
  const [active, setActive] = useState("acceptance");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white antialiased" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <Navbar />

      {/* PAGE HEADER */}
      <div className="mx-auto max-w-[1060px] px-[18px] pb-8 pt-[88px] md:px-12 md:pb-12 md:pt-[100px]">
        <p className="mb-2.5 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.09em] text-[#555]">
          <Scale className="h-3 w-3" />
          Legal
        </p>
        <h1 className="mb-3 text-[30px] font-extrabold leading-[1.05] tracking-[-0.04em] md:text-[42px]">
          Terms & Conditions
        </h1>
        <p className="text-[13px] text-[#444]">
          Last updated: <span className="text-[#555]">June 15, 2025</span>
          &nbsp;·&nbsp;
          Effective: <span className="text-[#555]">June 15, 2025</span>
        </p>
      </div>

      {/* MOBILE: Jump to section dropdown */}
      <div className="mx-auto max-w-[1060px] px-[18px] pb-6 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-[11px] text-[13px] text-[#ccc] outline-none">
              <span>
                Jump to: <span style={{ color: ACCENT }}>{sections.find((s) => s.id === active)?.title}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#555]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-36px)] border-[#1a1a1a] bg-[#0d0d0d] p-1.5">
            {sections.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "cursor-pointer rounded-md border-l-2 pl-3 text-[13px]",
                  active === s.id ? "border-[#a8ff3e] bg-[#111] text-[#ccc]" : "border-transparent text-[#444]"
                )}
              >
                {s.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto flex max-w-[1060px] items-start gap-16 px-[18px] pb-20 md:px-12 md:pb-[100px]">
        {/* SIDEBAR — desktop only */}
        <aside className="sticky top-20 hidden w-[200px] shrink-0 md:block">
          <p className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2e2e2e]">On this page</p>
          <div className="flex flex-col gap-px">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "rounded-md border-l-2 px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                  active === s.id ? "border-[#a8ff3e] bg-[#111] text-[#ccc]" : "border-transparent text-[#3a3a3a] hover:text-[#777]"
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        </aside>

        {/* CONTENT */}
        <main className="min-w-0 flex-1">
          <Section id="acceptance" title="Acceptance of Terms">
            <P>
              By accessing or using OSHunt — including any of its sub-products such as Issue Hunter and GitLense —
              you agree to be bound by these Terms and Conditions in full. If you don&apos;t agree with any part of
              these terms, you shouldn&apos;t use the platform.
            </P>
            <P>
              These Terms constitute a legally binding agreement between you (&quot;User&quot;) and OSHunt
              (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). Continued use of the platform after any update to
              these Terms constitutes your acceptance of the revised version.
            </P>
          </Section>

          <Section id="service" title="Description of Service">
            <P>
              OSHunt is an AI-powered open source contribution platform consisting of two core tools. Issue Hunter
              scans public GitHub repositories for open issues and matches them to a user&apos;s declared tech stack
              using Gemini-powered analysis — surfacing contributions that are genuinely likely to succeed. GitLense
              accepts any public GitHub repository URL and generates a plain-English breakdown of the project&apos;s
              structure, purpose, and recommended entry points for new contributors.
            </P>
            <P>
              OSHunt is not a GitHub product, nor is it affiliated with or endorsed by GitHub, Inc. in any way. It
              operates as a third-party tool that reads publicly available data via the GitHub API under the terms
              of GitHub&apos;s own policies.
            </P>
            <P>
              The platform is currently offered in an open beta. Features may change, be removed, or be limited
              without prior notice. We make no guarantees about uptime, data availability, or the continued
              existence of any specific feature during the beta period.
            </P>
          </Section>

          <Section id="accounts" title="User Accounts">
            <P>
              OSHunt uses GitHub OAuth via NextAuth for authentication. By signing in, you grant OSHunt permission to
              read your public profile and repository information as described during the OAuth consent flow. We do
              not request or store your GitHub password — ever.
            </P>
            <P>
              You&apos;re responsible for any activity that occurs under your account. If you suspect unauthorized
              access, you should revoke OSHunt&apos;s OAuth access from your GitHub account settings immediately and
              notify us.
            </P>
            <P>
              Accounts are personal and non-transferable. Creating multiple accounts to circumvent usage limits or
              platform policies is a violation of these Terms and may result in all associated accounts being
              suspended.
            </P>
          </Section>

          <Section id="acceptable" title="Acceptable Use">
            <P>
              OSHunt is built for individual developers who want to contribute to open source. You agree to use the
              platform in a way that&apos;s consistent with that purpose. Specifically, you may not use OSHunt to
              scrape or bulk-export GitHub issue data for commercial resale, to circumvent GitHub&apos;s own API rate
              limits or terms of service, or to automate contribution workflows in a way that misrepresents your
              involvement to repository maintainers.
            </P>
            <P>
              You also agree not to attempt to reverse-engineer, decompile, or extract the underlying AI prompts or
              model configuration powering Issue Hunter or GitLense. And you won&apos;t use OSHunt in any way that
              violates applicable law — including but not limited to privacy law, intellectual property law, or
              computer fraud statutes.
            </P>
            <P>
              We reserve the right to determine, at our sole discretion, what constitutes a violation of acceptable
              use and to act accordingly — including by suspending or terminating access.
            </P>
          </Section>

          <Section id="ip" title="Intellectual Property">
            <P>
              All original content on OSHunt — including the product design, UI, logo, copywriting, and AI-generated
              analysis outputs produced by the platform — is owned by OSHunt and protected under applicable
              intellectual property law. You&apos;re granted a limited, non-exclusive, non-transferable license to
              use the platform for your personal, non-commercial contribution activity.
            </P>
            <P>
              Content you submit to OSHunt — such as your declared tech stack, preferences, or any feedback —
              remains yours. By submitting it, you grant us a royalty-free license to use it for the purpose of
              delivering and improving the service.
            </P>
            <P>
              OSHunt does not claim ownership over any GitHub repository content, issue text, or codebase data
              accessed through the platform. That content belongs to its respective owners under their own
              licenses.
            </P>
          </Section>

          <Section id="third-party" title="Third-Party Services">
            <P>
              OSHunt integrates with several third-party services to function — notably the GitHub API and
              Google&apos;s Gemini API. Your use of OSHunt is therefore also subject to GitHub&apos;s Terms of
              Service and Google&apos;s Terms of Service for the Gemini API. We strongly encourage you to review
              those documents independently.
            </P>
            <P>
              We&apos;re not responsible for outages, data changes, or policy shifts imposed by those third-party
              providers that affect OSHunt&apos;s functionality. If GitHub changes its API or Gemini&apos;s behavior
              shifts, certain features may degrade or behave unexpectedly — and that&apos;s outside our control.
            </P>
            <P>
              Any links or references to external websites or services on OSHunt are provided for convenience only.
              We don&apos;t endorse those services and take no responsibility for their content or practices.
            </P>
          </Section>

          <Section id="privacy" title="Privacy & Data">
            <P>
              OSHunt collects limited personal data — specifically, your name, email, and GitHub profile information
              obtained during sign-in, along with any stack preferences you configure on the platform. This data is
              used solely to personalize your experience and is not sold to third parties.
            </P>
            <P>
              We use Neon (PostgreSQL) for data storage and standard industry practices for encryption at rest and
              in transit. Our full Privacy Policy, which covers data retention, deletion rights, and cookie use in
              more detail, is available at oshunt.io/privacy.
            </P>
            <P>
              Users in the EU and UK have rights under GDPR and UK GDPR respectively, including the right to access,
              correct, or delete their data. To exercise those rights, contact us at the address listed in the
              Contact section below.
            </P>
          </Section>

          <Section id="disclaimers" title="Disclaimers">
            <P>
              OSHunt is provided &quot;as is&quot; and &quot;as available&quot; — without warranties of any kind,
              express or implied. We don&apos;t warrant that the platform will be uninterrupted, error-free, or free
              of harmful components. We don&apos;t guarantee that Issue Hunter&apos;s match scores are accurate,
              that GitLense&apos;s codebase summaries are complete, or that any contribution you make based on
              OSHunt&apos;s suggestions will be accepted by a repository maintainer.
            </P>
            <P>
              AI-generated outputs are probabilistic by nature. Not just imperfect — genuinely unpredictable at
              times. You should use your own judgment when acting on any analysis produced by Issue Hunter or
              GitLense, and always verify information against the actual GitHub repository before writing or
              submitting code.
            </P>
          </Section>

          <Section id="liability" title="Limitation of Liability">
            <P>
              To the maximum extent permitted by applicable law, OSHunt and its team will not be liable for any
              indirect, incidental, special, consequential, or punitive damages — including loss of data, lost
              profits, or reputational harm — arising from your use of or inability to use the platform.
            </P>
            <P>
              Our total liability to you for any claim arising under these Terms, regardless of the form of action,
              is limited to the amount you&apos;ve paid to OSHunt in the twelve months preceding the claim. Since
              OSHunt is currently free, that amount is zero — which reflects the nature of a no-cost beta product
              offered in good faith.
            </P>
          </Section>

          <Section id="termination" title="Termination">
            <P>
              You may stop using OSHunt at any time and revoke our GitHub OAuth access from your GitHub settings. If
              you&apos;d like us to delete your account and associated data, email us at the address in the Contact
              section.
            </P>
            <P>
              We may suspend or terminate your access if you violate these Terms, if we&apos;re required to do so by
              law, or if we decide to shut down the platform. In cases of a material violation, termination may be
              immediate and without notice. In other cases, we&apos;ll make reasonable efforts to notify you in
              advance.
            </P>
            <P>
              Upon termination, your license to use OSHunt ends immediately. Sections of these Terms that should
              reasonably survive termination — including Intellectual Property, Disclaimers, and Limitation of
              Liability — will continue to apply.
            </P>
          </Section>

          <Section id="changes" title="Changes to Terms">
            <P>
              We may update these Terms at any time. When we do, we&apos;ll update the &quot;Last updated&quot; date
              at the top of this page. For material changes, we&apos;ll make a reasonable effort to notify
              registered users by email or via an in-app notice.
            </P>
            <P>
              Your continued use of OSHunt after a change takes effect constitutes your acceptance of the revised
              Terms. If you disagree with a change, the right move is to stop using the platform and, if you&apos;d
              like, reach out to us.
            </P>
          </Section>

          <Section id="contact" title="Contact">
            <P>
              These Terms are governed by the laws of India. Any disputes arising from your use of OSHunt will be
              subject to the exclusive jurisdiction of the courts of Bhopal, Madhya Pradesh.
            </P>
            <P>
              If you have questions about these Terms, want to report a violation, or need to exercise a data right,
              reach out at{" "}
              <a href="mailto:legal@oshunt.io" className="border-b border-[#a8ff3e44] text-[#a8ff3e] no-underline">
                legal@oshunt.io
              </a>
              . For general product questions, use{" "}
              <a href="mailto:hello@oshunt.io" className="border-b border-[#a8ff3e44] text-[#a8ff3e] no-underline">
                hello@oshunt.io
              </a>
              . We aim to respond within 3 business days.
            </P>
          </Section>

          <div className="mt-12 rounded-[10px] border border-[#1a1a1a] bg-[#0d0d0d] px-[22px] py-5">
            <p className="text-xs leading-[1.7] text-[#333]">
              These Terms were last reviewed on <strong className="text-[#444]">June 15, 2025</strong>. Questions?{" "}
              <a href="mailto:legal@oshunt.io" className="text-[#555] no-underline">
                legal@oshunt.io
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}