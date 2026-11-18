import { cn } from "@/components/lib/utils";
import { RANGE_META, type RangeKey } from "@/components/lib/admin/contract";

/** Re-export so admin files import one helper module. */
export const cx = cn;

const NUMBER = new Intl.NumberFormat("en-US");
const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** 12,480 */
export const num = (n: number): string => NUMBER.format(Number.isFinite(n) ? n : 0);

/** 12.5K, 3.4M. Use for tiles and axis ticks that reach the thousands. */
export const compact = (n: number): string => COMPACT.format(Number.isFinite(n) ? n : 0);

/** +12, −3, 0 (a real minus sign, so it lines up with the plus). */
export const signed = (n: number): string => `${n > 0 ? "+" : n < 0 ? "−" : ""}${num(Math.abs(n))}`;

/** 42%, 7.4% */
export const pct = (n: number, digits = 0): string =>
  `${(Number.isFinite(n) ? n : 0).toFixed(digits).replace(/\.0+$/, "")}%`;

/** Percent change from `previous` to `current`. null when there is no base to compare with. */
export function changePct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** 850 ms, 1.2 s, 38 s, 2.4 min */
export function duration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)} s`;
  if (ms < 120_000) return `${Math.round(ms / 1000)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

const toMs = (value: string | number | Date): number =>
  typeof value === "number" ? value : value instanceof Date ? value.getTime() : Date.parse(value);

/** "just now", "5 min ago", "3 h ago", "2 d ago", "4 mo ago". `now` comes from useNow() so lists tick together. */
export function ago(value: string | number | Date, now: number): string {
  const t = toMs(value);
  if (!Number.isFinite(t)) return "unknown";
  const seconds = Math.max(0, Math.round((now - t) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days} d ago`;
  return `${Math.round(days / 30)} mo ago`;
}

/** "in 4 min" for a future time (a paused provider's retry). */
export function until(value: number, now: number): string {
  const seconds = Math.max(0, Math.round((value - now) / 1000));
  if (seconds < 45) return "in under a minute";
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `in ${minutes} min`;
  return `in ${Math.round(minutes / 60)} h`;
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });
const HOUR_MIN = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const FULL = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** 3 Nov 2026 */
export const shortDate = (value: string | number | Date): string => {
  const t = toMs(value);
  return Number.isFinite(t) ? SHORT_DATE.format(t) : "unknown";
};

/** 3 Nov 2026, 14:30 */
export const dateTime = (value: string | number | Date): string => {
  const t = toMs(value);
  return Number.isFinite(t) ? FULL.format(t) : "unknown";
};

/** Short tick label for a bucket start. 24h: 14:00. 7d: Tue. 30d: 3 Nov. 6m: Nov. */
export function axisLabel(t: number, range: RangeKey): string {
  switch (range) {
    case "24h":
      return HOUR_MIN.format(t);
    case "7d":
      return WEEKDAY.format(t);
    case "6m":
      return MONTH.format(t);
    default:
      return DAY_MONTH.format(t);
  }
}

/** Longer label for the tooltip / readout of one bucket. */
export function bucketLabel(t: number, range: RangeKey): string {
  const { bucketMs } = RANGE_META[range];
  if (range === "24h") return `${DAY_MONTH.format(t)}, ${HOUR_MIN.format(t)}`;
  if (range === "6m") return `Week of ${DAY_MONTH.format(t)}`;
  return `${WEEKDAY.format(t)} ${DAY_MONTH.format(t)}${bucketMs > 0 ? "" : ""}`;
}

/** What one bucket is called in a sentence: "this hour", "this day", "this week". */
export const PERIOD: Record<RangeKey, string> = { "24h": "hour", "7d": "day", "30d": "day", "6m": "week" };

/** "opened_issue" -> "Opened issue". Unknown verbs stay readable. */
export function humanize(action: string): string {
  const words = action.replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "Unknown action";
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** "Ada Lovelace" -> "AL". Falls back to the first two letters, then "?". */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  const single = parts[0] ?? "";
  return (single.slice(0, 2) || "?").toUpperCase();
}

/** Small stable string hash (FNV-1a). Used to seed sample data so it does not jump between renders. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Evenly thins a series to at most `max` points (average per slot) so a sparkline stays readable. */
export function thin(values: readonly number[], max: number): number[] {
  if (values.length <= max) return [...values];
  const out: number[] = [];
  const step = values.length / max;
  for (let i = 0; i < max; i++) {
    const from = Math.floor(i * step);
    const to = Math.max(from + 1, Math.floor((i + 1) * step));
    const slice = values.slice(from, to);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

/**
 * Axis ticks on round numbers: 0, 5, 10, 15 instead of 0, 7, 13, 20. Starts at 0, covers `max`, never fewer than 4
 * (so a day with one signup does not fill the chart) and never more than `maxIntervals` gaps.
 */
export function niceTicks(max: number, maxIntervals = 4): number[] {
  const top = Number.isFinite(max) && max > 4 ? max : 4;
  const pow = Math.pow(10, Math.floor(Math.log10(top / maxIntervals)));
  let step = pow;
  for (const m of [1, 2, 5, 10]) {
    step = m * pow;
    if (Math.ceil(top / step) <= maxIntervals) break;
  }
  const count = Math.ceil(top / step);
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

/** Rounds an axis maximum up to a clean number (10, 20, 50, 100, 200, 500, ...). */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}
