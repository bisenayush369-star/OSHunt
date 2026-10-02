"use client";

import * as React from "react";
import { Check, CircleAlert, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CONTACT,
  LIMITS,
  MESSAGES,
  TOPICS,
  formatCount,
  mailtoHref,
  messageLength,
  validateContact,
  type ContactField,
  type FieldErrors,
  type TopicValue,
} from "@/lib/contact";
import { ContactGraph, setContactProgress } from "./contact-graph";

type Status = "idle" | "sending" | "sent";

const FIELD_ID: Record<ContactField, string> = {
  name: "contact-name",
  email: "contact-email",
  message: "contact-message",
};
const FIELD_ORDER: ContactField[] = ["name", "email", "message"];
const SEND_TIMEOUT_MS = 15_000;

const describedBy = (...ids: Array<string | false | undefined>) => ids.filter(Boolean).join(" ") || undefined;

const subscribeNever = () => () => {};
/** False while the server-rendered HTML is on screen, true once React has taken over the page. */
function useHydrated() {
  return React.useSyncExternalStore(subscribeNever, () => true, () => false);
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-destructive">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function ContactForm() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [topic, setTopic] = React.useState<TopicValue>("general");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [reference, setReference] = React.useState("");
  const [sentTo, setSentTo] = React.useState("");

  // Height of the form at the moment it is replaced, so the card doesn't collapse.
  const [holdHeight, setHoldHeight] = React.useState<number | undefined>(undefined);

  const cardRef = React.useRef<HTMLElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const successRef = React.useRef<HTMLHeadingElement>(null);
  const honeypotRef = React.useRef<HTMLInputElement>(null);
  const startedAt = React.useRef(0);

  // One source of truth. Errors only show after the first send attempt, then
  // update live as the visitor fixes each field. The one exception is a message
  // that is too long: that is flagged at once, because nothing is cut off silently.
  const validation = React.useMemo(
    () => validateContact({ name, email, topic, message }),
    [name, email, topic, message],
  );
  const filled = validation.ok ? 3 : 3 - Object.keys(validation.fields).length;
  const remaining = LIMITS.messageMax - messageLength(message);
  const submittedErrors: FieldErrors = submitted && !validation.ok ? validation.fields : {};
  const fieldErrors: FieldErrors =
    remaining < 0 && !submittedErrors.message ? { ...submittedErrors, message: MESSAGES.messageLong } : submittedErrors;
  const errorList = FIELD_ORDER.filter((field) => submittedErrors[field]).map((field) => ({
    field,
    text: submittedErrors[field] as string,
  }));
  const sending = status === "sending";
  const hydrated = useHydrated();
  const topicMeta = TOPICS.find((item) => item.value === topic) ?? TOPICS[0];

  React.useEffect(() => {
    // Monotonic, so a clock change mid-visit can't make a slow human look like a fast bot.
    startedAt.current = performance.now();
  }, []);

  // Keeps keyboard focus clear of a sticky header (WCAG 2.4.11, Focus Not Obscured): browsers
  // otherwise treat the very top of the page as usable. This only raises a value your own CSS
  // already sets, never lowers it, and is undone when the visitor leaves the page.
  React.useEffect(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    if ((parseFloat(styles.scrollPaddingTop) || 0) >= 5 * (parseFloat(styles.fontSize) || 16)) return;
    const previous = root.style.scrollPaddingTop;
    root.style.scrollPaddingTop = "5rem";
    return () => {
      root.style.scrollPaddingTop = previous;
    };
  }, []);

  // Drives the live cell in the header graph.
  React.useEffect(() => {
    setContactProgress(status === "sent" ? 4 : filled);
  }, [status, filled]);
  React.useEffect(() => () => setContactProgress(0), []);

  // Keyboard and screen-reader users land on what changed.
  React.useEffect(() => {
    if (failedAttempts > 0) summaryRef.current?.focus();
  }, [failedAttempts]);
  React.useEffect(() => {
    if (status !== "sent") return;
    successRef.current?.focus({ preventScroll: true });
    // By the time someone reaches "Send", the card header has often scrolled away. Bring it back
    // so they see the confirmation and the graph's pulse together.
    const card = cardRef.current;
    if (!card) return;
    const top = card.getBoundingClientRect().top;
    if (top < 80) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: window.scrollY + top - 96, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [status]);

  const statusText =
    status === "sent"
      ? `sent · ${reference}`
      : sending
        ? "sending…"
        : filled === 3
          ? "ready to send"
          : `${filled} of 3 fields done`;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setFailure(null);
    setSubmitted(true);
    if (!validation.ok) {
      setFailedAttempts((count) => count + 1);
      return;
    }

    const { data } = validation;
    setStatus("sending");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          website: honeypotRef.current?.value ?? "",
          elapsedMs: Math.round(performance.now() - startedAt.current),
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        ref?: string;
        error?: string;
      } | null;
      if (response.ok && payload?.ok) {
        setReference(payload.ref ?? "");
        setSentTo(data.email);
        setHoldHeight(formRef.current?.offsetHeight);
        setStatus("sent");
        return;
      }
      setFailure(payload?.error ?? "We couldn’t send your message.");
    } catch {
      setFailure("We couldn’t reach OSHunt. Check your connection and try again.");
    } finally {
      window.clearTimeout(timeout);
    }
    setStatus("idle");
  }

  function reset() {
    setStatus("idle");
    setTopic("general");
    setName("");
    setEmail("");
    setMessage("");
    setSubmitted(false);
    setFailedAttempts(0);
    setFailure(null);
    setReference("");
    setSentTo("");
    setHoldHeight(undefined);
    startedAt.current = performance.now();
    window.requestAnimationFrame(() => document.getElementById(FIELD_ID.name)?.focus());
  }

  return (
    <section
      ref={cardRef}
      id="contact-form"
      aria-labelledby="contact-form-title"
      className="min-w-0 overflow-hidden rounded-xl border border-white/8 bg-[#090909] text-[#efefef]"
    >
      <div className="border-b border-white/8 px-5 pb-3 pt-5 sm:px-8 sm:pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2
            id="contact-form-title"
            className="whitespace-nowrap text-lg font-semibold tracking-[-0.03em] text-[#f5f5f5] sm:text-xl"
          >
            New message
          </h2>
          <p aria-hidden="true" className="whitespace-nowrap font-mono text-xs text-[#7d7d7d]">
            {statusText}
          </p>
        </div>
        <ContactGraph className="mt-3" />
      </div>

      {status === "sent" ? (
        <div
          style={{ minHeight: holdHeight }}
          className="flex min-h-[22rem] flex-col items-start justify-center gap-5 p-5 sm:p-8"
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
            <Check aria-hidden className="size-6" />
          </span>
          <div className="min-w-0 space-y-2">
            <h3
              ref={successRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight outline-hidden"
            >
              Message sent
            </h3>
            <p className="text-muted-foreground">
              We usually reply within {CONTACT.replyTime}, to{" "}
              <span className="font-medium text-foreground [overflow-wrap:anywhere]">{sentTo}</span>. If you don’t
              see it, check your spam folder.
            </p>
          </div>
          {reference && (
            <p className="text-sm text-muted-foreground">
              Reference{" "}
              <code className="ml-1 select-all rounded border bg-muted px-1.5 py-0.5 font-mono text-foreground">
                {reference}
              </code>
              . Quote it if you write to us again about this.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 cursor-pointer focus-visible:outline-hidden"
            onClick={reset}
          >
            Send another message
          </Button>
        </div>
      ) : (
        <form
          ref={formRef}
          // Never read: onSubmit takes over. If anything ever submits natively (before the page
          // has hydrated, say), a POST keeps the visitor's words out of the address bar and history.
          method="post"
          noValidate
          onSubmit={onSubmit}
          className="relative flex flex-col gap-6 p-5 sm:p-8"
        >
          {errorList.length > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              aria-labelledby="contact-error-title"
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h3 id="contact-error-title" className="flex items-center gap-2 text-sm font-semibold text-[#efefef]">
                <CircleAlert aria-hidden className="size-4 shrink-0 text-[#ff5f56]" />
                Fix {errorList.length} {errorList.length === 1 ? "field" : "fields"} before sending
              </h3>
              <ul className="mt-2 space-y-1 pl-6 text-sm">
                {errorList.map(({ field, text }) => (
                  <li key={field}>
                    <a
                      href={`#${FIELD_ID[field]}`}
                      onClick={(event) => {
                        event.preventDefault();
                        document.getElementById(FIELD_ID[field])?.focus();
                      }}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium">Topic</legend>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((item) => {
                const checked = topic === item.value;
                return (
                  <label key={item.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="topic"
                      value={item.value}
                      checked={checked}
                      onChange={() => setTopic(item.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-200 sm:min-h-10",
                        "peer-focus-visible:outline-hidden peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                        checked
                          ? "border-[#a8ff3e]/50 bg-[#a8ff3e]/10 font-medium text-[#f5f5f5]"
                          : "text-[#7d7d7d] hover:border-white/15 hover:text-[#efefef]",
                      )}
                    >
                      {checked ? (
                        <Check aria-hidden className="size-3.5 text-[#a8ff3e]" />
                      ) : (
                        <span
                          aria-hidden
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: item.dot }}
                        />
                      )}
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor={FIELD_ID.name}>Name</Label>
              <Input
                id={FIELD_ID.name}
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                autoCapitalize="words"
                required
                aria-invalid={fieldErrors.name ? true : undefined}
                aria-describedby={describedBy(fieldErrors.name && `${FIELD_ID.name}-error`)}
                className="h-11 focus-visible:outline-hidden"
              />
              {fieldErrors.name && <FieldError id={`${FIELD_ID.name}-error`}>{fieldErrors.name}</FieldError>}
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={FIELD_ID.email}>Email</Label>
              <Input
                id={FIELD_ID.email}
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                required
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={describedBy(`${FIELD_ID.email}-hint`, fieldErrors.email && `${FIELD_ID.email}-error`)}
                className="h-11 focus-visible:outline-hidden"
              />
              <p id={`${FIELD_ID.email}-hint`} className="text-sm text-muted-foreground">
                Where we’ll reply.
              </p>
              {fieldErrors.email && <FieldError id={`${FIELD_ID.email}-error`}>{fieldErrors.email}</FieldError>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={FIELD_ID.message}>Message</Label>
            <Textarea
              id={FIELD_ID.message}
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder={topicMeta.placeholder}
              autoComplete="off"
              required
              aria-invalid={fieldErrors.message ? true : undefined}
              aria-describedby={describedBy(
                `${FIELD_ID.message}-count`,
                fieldErrors.message && `${FIELD_ID.message}-error`,
              )}
              className="min-h-36 max-h-80 focus-visible:outline-hidden"
            />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
              {fieldErrors.message && (
                <div className="min-w-0">
                  <FieldError id={`${FIELD_ID.message}-error`}>{fieldErrors.message}</FieldError>
                </div>
              )}
              {/* No maxLength: a long paste (a stack trace, say) must never be cut off without telling anyone. */}
              <p
                id={`${FIELD_ID.message}-count`}
                className={cn(
                  "shrink-0 self-end font-mono text-xs tabular-nums sm:ml-auto sm:self-auto",
                  remaining < 0 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {remaining < 0
                  ? `${formatCount(-remaining)} ${remaining === -1 ? "character" : "characters"} over`
                  : `${formatCount(remaining)} ${remaining === 1 ? "character" : "characters"} left`}
              </p>
            </div>
          </div>

          {/* Honeypot: invisible to people and assistive tech. Bots fill it. Its name is deliberately
              not one that browsers or password managers autofill (website, url, company, phone…). */}
          <div aria-hidden="true" className="absolute -left-[9999px] top-0 size-px overflow-hidden">
            <label>
              Leave this field empty
              <input
                ref={honeypotRef}
                type="text"
                name="extra_details"
                tabIndex={-1}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </label>
          </div>

          {failure && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
            >
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 space-y-1">
                <p>{failure}</p>
                <a
                  href={mailtoHref(`[OSHunt · ${topicMeta.label}] ${name.trim()}`.trim(), message)}
                  className="font-medium underline underline-offset-4"
                >
                  Send it from your email app instead
                </a>
              </div>
            </div>
          )}

          {/* Without JavaScript the form can't send. Say so, and give another way. */}
          <noscript>
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              Sending needs JavaScript. Email{" "}
              <a href={`mailto:${CONTACT.email}`} className="font-medium underline underline-offset-4">
                {CONTACT.email}
              </a>{" "}
              instead.
            </p>
          </noscript>

          <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">We only use your details to reply.</p>
            {/* `disabled` until the page has hydrated: before that nothing is listening, and a native
                submit (Enter in a field, say) would reload the page and lose what was typed. It keeps its
                normal look (disabled:opacity-100) so it doesn't flash when React takes over. */}
            <Button
              type="submit"
              size="lg"
              disabled={!hydrated}
              aria-disabled={sending}
              className="h-11 w-full cursor-pointer gap-2 focus-visible:outline-hidden disabled:opacity-100 sm:w-auto sm:min-w-44 aria-disabled:pointer-events-none aria-disabled:opacity-70"
            >
              {sending ? (
                <>
                  <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
                  Sending…
                </>
              ) : (
                <>
                  Send message
                  <Send aria-hidden />
                </>
              )}
            </Button>
          </div>
          <span role="status" className="sr-only">
            {sending ? "Sending your message" : ""}
          </span>
        </form>
      )}
    </section>
  );
}
