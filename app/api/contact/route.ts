import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { CONTACT, TOPICS, truncate, validateContact, type ContactInput } from "@/app/contact/lib/contact";

export const runtime = "nodejs";

/**
 * POST /api/contact
 *
 * Environment variables:
 *   RESEND_API_KEY      Resend API key (https://resend.com).
 *   CONTACT_TO_EMAIL    Inbox that receives messages. Comma-separate for several.
 *   CONTACT_FROM_EMAIL  Optional sender on a domain verified in Resend,
 *                       e.g. "OSHunt <contact@oshunt.in>".
 *   CONTACT_IP_HEADER   Optional. A header your host sets with the visitor's address
 *                       (see clientKey). Needed when more than one proxy is in front.
 *
 * Without the first two, `next dev` logs the message and reports success.
 * Everywhere else the route answers 503 instead, so a message is never silently dropped.
 */

const MAX_BODY_BYTES = 32 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
/** Used when the visitor's address can't be read: everyone then shares one bucket, so it is roomier. */
const RATE_MAX_SHARED = 30;
const RATE_MAX_DEVELOPMENT = 100;
const MAX_TRACKED_CLIENTS = 20_000;
const MAX_ADDRESS_LENGTH = 64; // an IPv6 address with a zone id is under 50
const UNKNOWN_CLIENT = "unknown";
/** Faster than a person can load the page and write a message: treated as a bot. */
const MIN_ELAPSED_MS = 1200;
const SEND_TIMEOUT_MS = 10_000;

const isDevelopment = () => process.env.NODE_ENV === "development";

// In-memory limiter: fine for one server. On serverless or several instances,
// swap for a shared store such as Upstash Redis.
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, now: number) {
  if (hits.size >= MAX_TRACKED_CLIENTS) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    if (hits.size >= MAX_TRACKED_CLIENTS) {
      // Still full of live entries: forget the oldest tenth, never everybody. Clients who have
      // made a single request go first, so a flood of throwaway keys can't free someone who is
      // already blocked.
      let drop = Math.ceil(MAX_TRACKED_CLIENTS / 10);
      for (const [k, v] of hits) {
        if (drop <= 0) break;
        if (v.count <= 1) {
          hits.delete(k);
          drop -= 1;
        }
      }
      for (const k of hits.keys()) {
        if (drop <= 0) break;
        hits.delete(k);
        drop -= 1;
      }
    }
  }
  const max = isDevelopment() ? RATE_MAX_DEVELOPMENT : key === UNKNOWN_CLIENT ? RATE_MAX_SHARED : RATE_MAX;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.delete(key); // re-insert at the end, so the Map stays ordered oldest first
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }
  entry.count += 1;
  return { limited: entry.count > max, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

/**
 * Best-effort identity for rate limiting. What a visitor can forge depends on the host:
 *  - CONTACT_IP_HEADER, when set, names a header your host writes itself and overwrites
 *    (Vercel: x-vercel-forwarded-for, Cloudflare: cf-connecting-ip).
 *  - Otherwise the LAST x-forwarded-for entry, which is the address your nearest proxy saw.
 *    Earlier entries are whatever the visitor sent, so they are never trusted.
 *  - Then x-real-ip. With none of these, all visitors share one bucket.
 * The key is a hash, so every entry has the same small size however long the header was
 * (a substring would keep the whole header alive in memory), and the table never holds an address.
 */
function clientKey(req: Request) {
  const named = process.env.CONTACT_IP_HEADER?.trim().toLowerCase();
  const raw =
    (named && req.headers.get(named)) || req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const address = raw?.split(",").at(-1)?.trim().slice(0, MAX_ADDRESS_LENGTH);
  if (!address) return UNKNOWN_CLIENT;
  return createHash("sha256").update(address).digest("base64url");
}

function reply(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Reads the body but gives up as soon as it passes `max` bytes, even when chunked. */
async function readCapped(req: Request, max: number): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > max) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** 32 symbols with no 0/O/1/I, so a reference is easy to read out loud. 256 % 32 = 0, so no modulo bias. */
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newReference() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) id += REF_ALPHABET[byte % REF_ALPHABET.length];
  return `OSH-${id}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compose(data: ContactInput, ref: string) {
  const topic = TOPICS.find((t) => t.value === data.topic)?.label ?? "General";
  const subject = `[OSHunt · ${topic}] ${truncate(data.name, 60)} (${ref})`;
  const text = [`Reference: ${ref}`, `Topic: ${topic}`, `From: ${data.name} <${data.email}>`, "", data.message].join("\n");
  const html = [
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;color:#111">`,
    `<p style="margin:0 0 12px"><strong>${escapeHtml(data.name)}</strong> &lt;${escapeHtml(data.email)}&gt;<br>`,
    `${escapeHtml(topic)} · ${ref}</p>`,
    `<div style="white-space:pre-wrap;border-left:3px solid #d0d7de;padding-left:12px">${escapeHtml(data.message)}</div>`,
    `</div>`,
  ].join("");
  return { subject, text, html };
}

export async function POST(req: Request) {
  const now = Date.now();

  // Only this site's own pages may post. Checked first, so another site can't burn a visitor's allowance.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return reply({ error: "Invalid request." }, 403);

  const limit = rateLimit(clientKey(req), now);
  if (limit.limited) {
    return reply(
      { error: "You've sent several messages in a short time. Try again in a few minutes." },
      429,
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  // Exact media type. Cross-site HTML forms can't send JSON, and a cross-site fetch with a JSON
  // type needs a CORS preflight we never grant. (A substring test would let `text/plain;application/json` through.)
  const mediaType = req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") return reply({ error: "Send the message as JSON." }, 415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return reply({ error: "That message is too large." }, 413);
  }

  const raw = await readCapped(req, MAX_BODY_BYTES);
  if (raw === null) return reply({ error: "That message is too large." }, 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }

  // Bot traps. Answer as if it worked so bots learn nothing.
  const honeypot = typeof body.website === "string" && body.website.trim().length > 0;
  const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : Number.NaN;
  if (honeypot || elapsedMs < MIN_ELAPSED_MS) return reply({ ok: true, ref: newReference() });

  const result = validateContact(body);
  if (!result.ok) return reply({ error: "Check your details and try again.", fields: result.fields }, 422);
  const { data } = result;

  const ref = newReference();
  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.CONTACT_TO_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const from = process.env.CONTACT_FROM_EMAIL || "OSHunt <onboarding@resend.dev>";

  if (!apiKey || to.length === 0) {
    if (!isDevelopment()) {
      console.error("[contact] RESEND_API_KEY or CONTACT_TO_EMAIL is not set; message rejected", ref);
      return reply({ error: `Messaging is unavailable right now. Email us at ${CONTACT.email} instead.` }, 503);
    }
    console.info("[contact] email not configured, so this message was not sent (dev only)", { ref, ...data });
    return reply({ ok: true, ref });
  }

  const { subject, text, html } = compose(data, ref);
  const failure = `We couldn't send your message. Try again, or email ${CONTACT.email}.`;

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, reply_to: data.email, subject, text, html }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[contact] send failed", ref, error);
    return reply({ error: failure }, 502);
  }

  if (!response.ok) {
    console.error("[contact] Resend rejected the message", ref, response.status, (await response.text()).slice(0, 500));
    return reply({ error: failure }, 502);
  }

  return reply({ ok: true, ref });
}
