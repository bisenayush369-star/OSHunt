/**
 * Shared by the contact page, the form (client) and /api/contact (server).
 * Keep this file free of server-only imports and secrets.
 */

export const SITE_URL = "https://oshunt.in";

// TODO: replace these placeholders with OSHunt's real details.
export const CONTACT = {
  email: "hello@oshunt.in",
  issuesUrl: "https://github.com/oshunt/oshunt/issues/new",
  discussionsUrl: "https://github.com/oshunt/oshunt/discussions",
  faqHref: "/faq",
  /** Where the "Run a checkup" button at the bottom of the page goes. */
  checkupHref: "/signup",
  /** Shown as "usually within …". Only promise what you will keep. */
  replyTime: "1–2 business days",
} as const;

/**
 * Topics look like GitHub labels. `dot` is decorative: the label text and a
 * check mark carry the meaning, never the colour alone.
 */
export const TOPICS = [
  { value: "general", label: "General", dot: "#8b949e", placeholder: "Ask anything about OSHunt." },
  { value: "bug", label: "Bug", dot: "#f85149", placeholder: "What happened, what you expected, and which page you were on." },
  { value: "feature", label: "Feature idea", dot: "#39c5cf", placeholder: "What are you trying to do, and what's missing?" },
  { value: "profile", label: "Profile checkup", dot: "#3fb950", placeholder: "What looks wrong or unclear in your profile checkup?" },
  { value: "partnership", label: "Partnership", dot: "#a371f7", placeholder: "Tell us about your project or community and what you have in mind." },
] as const;

export type TopicValue = (typeof TOPICS)[number]["value"];

export function isTopic(value: unknown): value is TopicValue {
  return TOPICS.some((topic) => topic.value === value);
}

export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 254,
  messageMin: 10,
  messageMax: 4000,
} as const;

/** Explicit locale, so the server and the browser print the same digits. */
export const formatCount = (value: number) => value.toLocaleString("en-US");

export const MESSAGES = {
  name: "Enter your name.",
  email: "Enter a valid email address, like you@example.com.",
  messageShort: `Write at least ${LIMITS.messageMin} characters so we can help.`,
  messageLong: `Keep your message to ${formatCount(LIMITS.messageMax)} characters or fewer.`,
} as const;

export type ContactField = "name" | "email" | "message";
export type FieldErrors = Partial<Record<ContactField, string>>;
export type ContactInput = { name: string; email: string; topic: TopicValue; message: string };
export type ValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; fields: FieldErrors };

/**
 * Pragmatic address check, not the whole RFC. The address becomes the Reply-To
 * header, so nothing that could smuggle in a display name or a second recipient
 * may pass (`, ; < > ( ) [ ] \ : "` and whitespace).
 *  - local part: dot-separated pieces, none empty (no leading, trailing or double dots)
 *  - domain: dot-separated labels of letters and digits in any script, hyphens only
 *    inside, 63 characters at most, ending in a top-level domain of 2+ characters
 *    that is not all digits
 * Every piece is delimited by a literal dot, so the pattern cannot backtrack badly.
 */
const ATOM = String.raw`[^\s@,;<>()[\]\\:".]+`;
const LABEL = String.raw`[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?`;
const TLD = String.raw`(?![\p{N}-]+$)[\p{L}\p{N}][\p{L}\p{N}-]{0,61}[\p{L}\p{N}]`;
const EMAIL_PATTERN = new RegExp(`^${ATOM}(?:\\.${ATOM})*@(?:${LABEL}\\.)+${TLD}$`, "u");

/**
 * Formatting characters that only ever hide or reorder text: byte-order mark,
 * zero-width space, and the bidi embeddings, overrides and isolates. The joiners
 * (U+200C, U+200D) and direction marks (U+200E, U+200F) stay, because Persian,
 * Indic scripts, emoji sequences and right-to-left text need them.
 */
function isInvisible(code: number) {
  return (
    code === 0xfeff ||
    code === 0x200b ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

/**
 * Removes control characters, hidden formatting characters and broken
 * surrogate halves. Line breaks survive only when `multiline` is set (CR is
 * dropped, so CRLF becomes LF).
 */
function sanitize(input: string, multiline: boolean) {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 10 || code === 9) {
      out += multiline ? ch : " ";
      continue;
    }
    if (code === 13) {
      out += multiline ? "" : " ";
      continue;
    }
    if (code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff) || isInvisible(code)) continue;
    out += ch;
  }
  return out;
}

const charCount = (text: string) => Array.from(text).length;

/** Cuts to `max` characters. Counts code points, so an emoji is never split in half. */
export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join("");
}

/** Length of a message as the validator counts it, so the form's counter agrees with the server. */
export function messageLength(raw: string) {
  return charCount(sanitize(raw, true).trim());
}

const asText = (value: unknown) => (typeof value === "string" ? value : "");

export function validateContact(raw: {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
}): ValidationResult {
  const name = truncate(sanitize(asText(raw.name), false).replace(/\s+/g, " ").trim(), LIMITS.nameMax).trimEnd();
  const email = sanitize(asText(raw.email), false).trim();
  const message = sanitize(asText(raw.message), true).trim();
  const topic: TopicValue = isTopic(raw.topic) ? raw.topic : "general";

  const fields: FieldErrors = {};
  if (charCount(name) < LIMITS.nameMin) fields.name = MESSAGES.name;
  if (email.length > LIMITS.emailMax || !EMAIL_PATTERN.test(email)) fields.email = MESSAGES.email;
  const messageChars = charCount(message);
  if (messageChars < LIMITS.messageMin) fields.message = MESSAGES.messageShort;
  else if (messageChars > LIMITS.messageMax) fields.message = MESSAGES.messageLong;

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, data: { name, email, topic, message } };
}

/** Some mail apps refuse very long mailto: links, so the body is cut to this many encoded characters. */
const MAILTO_BODY_BUDGET = 1800;

function clipEncoded(text: string, budget: number) {
  let out = "";
  let used = 0;
  for (const ch of text) {
    const size = encodeURIComponent(ch).length;
    if (used + size > budget) break;
    out += ch;
    used += size;
  }
  return out;
}

/** Fallback when the form can't send: opens the visitor's mail app with their text. */
export function mailtoHref(subject: string, body = "") {
  const params = [`subject=${encodeURIComponent(truncate(sanitize(subject, false).trim(), 120))}`];
  const text = clipEncoded(sanitize(body, true).trim(), MAILTO_BODY_BUDGET);
  if (text) params.push(`body=${encodeURIComponent(text)}`);
  return `mailto:${CONTACT.email}?${params.join("&")}`;
}
