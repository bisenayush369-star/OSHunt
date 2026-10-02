import Link from "next/link";
import { ArrowUpRight, Bug, CircleHelp, Clock, Lightbulb, Mail, ShieldCheck, type LucideIcon } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import { CopyButton } from "./copy-button";
import { Reveal } from "./reveal";

const ROW =
  "group flex min-w-0 flex-1 items-start gap-4 p-4 outline-hidden transition-colors duration-200 hover:bg-white/[0.015] focus-visible:bg-white/[0.015] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e] sm:p-5";
const ICON_BOX =
  "flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-[#101010] text-[#7d7d7d] transition-colors duration-200 group-hover:text-[#efefef]";

function RouteRow({
  icon: Icon,
  title,
  description,
  cta,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  href: string;
}) {
  return (
    <li className="flex">
      <a href={href} target="_blank" rel="noopener noreferrer" className={ROW}>
        <span className={ICON_BOX}>
          <Icon aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
            {cta}
            <ArrowUpRight
              aria-hidden
              className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
            <span className="sr-only">(opens in a new tab)</span>
          </span>
        </span>
      </a>
    </li>
  );
}

export function ContactChannels() {
  return (
    <aside aria-labelledby="direct-title" className="min-w-0 space-y-6">
      <div>
        <h2 id="direct-title" className="text-lg font-semibold tracking-tight text-[#f5f5f5] sm:text-xl">
          Or go direct
        </h2>
        <p className="mt-1 text-sm text-[#7d7d7d]">Pick the route that fits what you need.</p>
      </div>

      <ul className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/8 bg-[#090909]">
        <li className="flex items-center">
          <a href={`mailto:${CONTACT.email}`} className={ROW}>
            <span className={ICON_BOX}>
              <Mail aria-hidden className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Email</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Accounts, billing, partnerships, anything else.
              </span>
              <span className="mt-2 block font-mono text-sm underline decoration-primary underline-offset-4 [overflow-wrap:anywhere]">
                {CONTACT.email}
              </span>
            </span>
          </a>
          <CopyButton value={CONTACT.email} label="email address" className="mr-3 size-11 shrink-0 cursor-pointer sm:mr-4" />
        </li>
        <RouteRow
          icon={Bug}
          title="Report a bug"
          description="Public and tracked. Include the page and the steps to reproduce."
          cta="Open a GitHub issue"
          href={CONTACT.issuesUrl}
        />
        <RouteRow
          icon={Lightbulb}
          title="Suggest a feature"
          description="Say what you’re trying to do and what’s missing."
          cta="Start a discussion"
          href={CONTACT.discussionsUrl}
        />
      </ul>

      <Reveal>
        <div className="rounded-2xl border bg-card/50 p-5">
          <h3 className="text-sm font-medium">Good to know</h3>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground/70" />
              <span>We usually reply within {CONTACT.replyTime}.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground/70" />
              <span>We only use your details to reply to you.</span>
            </li>
            <li className="flex items-start gap-3">
              <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground/70" />
              <span>
                Quick question? The{" "}
                <Link
                  href={CONTACT.faqHref}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  FAQ
                </Link>{" "}
                may already answer it.
              </span>
            </li>
          </ul>
        </div>
      </Reveal>
    </aside>
  );
}
