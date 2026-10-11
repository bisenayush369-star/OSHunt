import type { RangeKey } from "@/components/lib/admin/contract";

/** Join class names, skipping falsy values. (No dependency on the project's cn helper.) */
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const NUMBER = new Intl.NumberFormat("en-US");
export const num = (n: number) => NUMBER.format(n);

export function percent(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  const p = (part / whole) * 100;
  return `${p >= 10 ? Math.round(p) : p.toFixed(1).replace(/\.0$/, "")}%`;
}

/** "3m ago". `now` is passed in so a whole screen can share one ticking clock. */
export function ago(value: string | number, now: number): string {
  const t = typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(t)) return "unknown";
  const minutes = Math.max(0, now - t) / 60_000;
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 43_200) return `${Math.floor(minutes / 1_440)}d ago`;
  return `${Math.floor(minutes / 43_200)}mo ago`;
}

export function shortDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "unknown"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "admin_blocked" -> "Admin blocked", "PushEvent" -> "Push" */
export function humanize(action: string): string {
  const cleaned = action
    .replace(/Event$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Action";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] ?? "?"];
  return letters.map((p) => p?.charAt(0) ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

/** Stable 32-bit hash (FNV-1a). Gives each user a fixed bearing on the radar. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Compact span: 45s, 12m, 3h, 2d. */
export function spanLabel(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** Long label for the readout: "Tue, Oct 6" / "Oct 6, 2 PM" / "Week of Oct 6". */
export function bucketTitle(t: number, range: RangeKey): string {
  const d = new Date(t);
  switch (range) {
    case "24h":
      return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
    case "6m":
      return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    default:
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
}

/** Short x-axis label. */
export function bucketTick(t: number, range: RangeKey): string {
  const d = new Date(t);
  switch (range) {
    case "24h":
      return d.toLocaleTimeString("en-US", { hour: "numeric" });
    case "7d":
      return d.toLocaleDateString("en-US", { weekday: "short" });
    default:
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}
