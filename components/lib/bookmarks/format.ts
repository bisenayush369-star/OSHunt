/** Small display helpers for the bookmark UI. No dependency on any other page's utils. */

export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

function trimZero(value: string): string {
  return value.replace(/\.0$/, "");
}

/** 1234 -> "1.2k", 15300 -> "15k", 2_400_000 -> "2.4m". */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1000) return String(Math.round(value));
  if (abs < 999_500) return `${trimZero((value / 1000).toFixed(abs < 10_000 ? 1 : 0))}k`;
  return `${trimZero((value / 1_000_000).toFixed(1))}m`;
}

/** plural(1, "repo") -> "1 repo", plural(3, "repo") -> "3 repos". */
export function plural(count: number, singular: string, pluralForm: string = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
