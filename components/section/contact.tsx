import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactChannels } from "@/components/contact/contact-channels";
import { ContactForm } from "@/components/contact/contact-form";
import { Reveal } from "@/components/contact/reveal";
import { CONTACT, SITE_URL } from "@/lib/contact";

const TITLE = "Contact OSHunt";
const DESCRIPTION =
  "Send OSHunt a question, a bug report or a feature idea. We reply by email, and bugs are easiest to follow as public GitHub issues.";

export const metadata: Metadata = {
  // `absolute` keeps the title as written even if the root layout has a title template.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
  // Next replaces the root layout's openGraph object instead of merging into it. If your layout
  // sets an `images` entry or `locale`, repeat it here.
  openGraph: {
    type: "website",
    siteName: "OSHunt",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/contact`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: TITLE,
  url: `${SITE_URL}/contact`,
  description: DESCRIPTION,
  mainEntity: { "@type": "Organization", name: "OSHunt", url: SITE_URL, email: CONTACT.email },
};

export default function ContactPage() {
  return (
    // If your root layout already wraps pages in <main>, change this to <div>.
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-10 text-[#efefef] sm:px-6 sm:pt-16 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="max-w-2xl">
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-[#7d7d7d]">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/"
                className="-mx-1 -my-4 inline-block rounded-sm px-1 py-4 underline-offset-4 outline-hidden hover:text-[#efefef] hover:underline focus-visible:ring-2 focus-visible:ring-[#a8ff3e]"
              >
                oshunt
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[#efefef]">
              contact
            </li>
          </ol>
        </nav>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.06em] text-[#f5f5f5] sm:text-4xl lg:text-5xl">
          Send us a question, a bug or an idea
        </h1>
        <p className="mt-4 text-pretty text-base text-[#7d7d7d] sm:text-lg">
          Pick a topic, write a few lines, and we’ll reply by email. Bugs are easiest to track as public GitHub
          issues.
        </p>
      </header>

      <div className="mt-10 grid items-start gap-8 lg:mt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <div className="rounded-xl border border-white/8 bg-[#090909]">
          <ContactForm />
        </div>
        <div className="rounded-xl border border-white/8 bg-[#090909]">
          <ContactChannels />
        </div>
      </div>

      <Reveal className="mt-12 lg:mt-16">
        <section
          aria-labelledby="cta-title"
          className="flex flex-col gap-6 rounded-2xl border bg-card/50 p-6 sm:p-8 md:flex-row md:items-center md:justify-between"
        >
          <div className="max-w-xl">
            <h2 id="cta-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
              Improve your GitHub profile
            </h2>
            <p className="mt-2 text-muted-foreground">Run the profile checkup on your own account.</p>
          </div>
          <Button asChild size="lg" className="h-11 w-full gap-2 focus-visible:outline-hidden md:w-auto">
            <Link href={CONTACT.checkupHref}>
              Run a checkup
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </section>
      </Reveal>
    </main>
  );
}
