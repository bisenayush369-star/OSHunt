import { Fragment, type CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Backdrop } from "@/components/contact/backdrop";
import { ContactChannels } from "@/components/contact/contact-channels";
import { ContactForm } from "@/components/contact/contact-form";
import { CONTACT, SITE_URL } from "@/lib/contact";
import "./contact.css";

const TITLE = "Contact OSHunt";
const DESCRIPTION =
  "Send OSHunt a question, a bug report or a feature idea. We reply by email.";
const HEADLINE = "Send us a question, a bug or an idea".split(" ");

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
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

const step = (index: number) => ({ "--i": index }) as CSSProperties;

export default function ContactPage() {
  return (
    <div className="oh-contact relative isolate">
      <Backdrop />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />

        <header className="max-w-2xl">
          <nav aria-label="Breadcrumb" style={step(0)} className="oh-enter font-mono text-xs text-(--oh-muted)">
            <ol className="flex items-center gap-2">
              <li>
                <Link
                  href="/"
                  className="-mx-1 -my-4 inline-block rounded-sm px-1 py-4 underline-offset-4 outline-hidden transition-colors hover:text-(--oh-strong) hover:underline focus-visible:ring-2 focus-visible:ring-(--oh-accent)"
                >
                  oshunt
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-(--oh-strong)">
                contact
              </li>
            </ol>
          </nav>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-(--oh-strong) sm:text-4xl lg:text-5xl">
            {HEADLINE.map((word, index) => (
              <Fragment key={index}>
                <span className="oh-word-clip">
                  <span style={step(index)} className="oh-word">
                    {word}
                  </span>
                </span>
                {index < HEADLINE.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p style={step(4)} className="oh-enter mt-4 text-pretty text-base text-(--oh-soft) sm:text-lg">
            Pick a topic, write a few lines, and we’ll reply by email.
          </p>
        </header>

        <div className="mt-10 grid items-start gap-8 lg:mt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
          <div style={step(5)} className="oh-enter min-w-0">
            <ContactForm />
          </div>
          <ContactChannels />
        </div>

      </main>
    </div>
  );
}