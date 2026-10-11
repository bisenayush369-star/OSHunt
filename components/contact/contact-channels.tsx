import Link from "next/link";
import { Bug, CircleHelp, Clock, Lightbulb, Mail, ShieldCheck } from "lucide-react";
import { CONTACT, type TopicValue } from "@/app/contact/lib/contact";
import { CopyButton } from "./copy-button";
import { Reveal } from "./reveal";
import { TopicLink } from "./topic-link";

const ROW =
  "group flex min-w-0 flex-1 items-start gap-4 p-4 outline-hidden transition-colors duration-200 hover:bg-white/[0.015] focus-visible:bg-white/[0.015] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e] sm:p-5";
const ICON_BOX =
  "flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-[#101010] text-[#7d7d7d] transition-colors duration-200 group-hover:text-[#efefef]";

function TopicRow({
  icon: Icon,
  title,
  description,
  cta,
  topic,
}: {
  icon: typeof Bug;
  title: string;
  description: string;
  cta: string;
  topic: TopicValue;
}) {
  return (
    <li className="flex">
      <TopicLink topic={topic} className={ROW}>
        <span className={ICON_BOX}>
          <Icon aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium">{cta}</span>
        </span>
      </TopicLink>
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
        <TopicRow
          icon={Bug}
          title="Report a bug"
          description="Public and tracked. Include the page and the steps to reproduce."
          cta="Report it in the form"
          topic="bug"
        />
        <TopicRow
          icon={Lightbulb}
          title="Suggest a feature"
          description="Say what you’re trying to do and what’s missing."
          cta="Share it in the form"
          topic="feature"
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
