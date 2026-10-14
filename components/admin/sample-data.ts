import type { BillingSection, StatsResponse, UsageSection } from "@/components/lib/admin/contract";
import { hash32 } from "./format";

/**
 * SAMPLE DATA, for layout preview only.
 *
 * Until the ApiUsage and Subscription tables exist, the API-calls and paid-users graphs have
 * nothing to draw. Instead of showing empty boxes, the console can draw these invented numbers,
 * always labelled "Sample" in the UI, so the person can see what the finished graphs look like.
 * They are generated from the real bucket grid (so the axes line up) with a seeded generator
 * (so they do not jump around on every sync). Nothing here is ever written anywhere.
 *
 * The console only uses them where the server reported `available: false`. Real data always
 * wins, and the preview can be switched off from the banner.
 */

export type SampleUsage = Extract<UsageSection, { available: true }>;
export type SampleBilling = Extract<BillingSection, { available: true }>;

/** mulberry32: a tiny seeded generator, so the same range always draws the same sample. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PER_BUCKET: Record<StatsResponse["range"], number> = { "24h": 34, "7d": 380, "30d": 260, "6m": 1500 };

export function sampleUsage(stats: StatsResponse): SampleUsage {
  const rand = seeded(hash32(`usage:${stats.range}`));
  const n = stats.buckets.length;
  const scale = Math.max(1, Math.min(6, Math.sqrt(Math.max(stats.totals.users, 120) / 120)));
  const cycles = stats.range === "24h" ? 2 : 3.5;

  const buckets = stats.buckets.map((b, i) => {
    const wave = 0.72 + 0.28 * Math.sin((i / n) * Math.PI * cycles + 1);
    const drift = 0.7 + (i / Math.max(1, n - 1)) * 0.5;
    const github = Math.round(PER_BUCKET[stats.range] * scale * wave * drift * (0.82 + rand() * 0.36));
    const llm = Math.round(github * (0.34 + rand() * 0.2));
    const errors = Math.round((github + llm) * rand() * 0.035);
    return { t: b.t, github, llm, errors, tokens: Math.round(llm * (850 + rand() * 900)) };
  });

  const totals = buckets.reduce(
    (sum, b) => ({ github: sum.github + b.github, llm: sum.llm + b.llm, errors: sum.errors + b.errors, tokens: sum.tokens + b.tokens }),
    { github: 0, llm: 0, errors: 0, tokens: 0 },
  );

  const mini = Math.round(totals.llm * 0.58);
  const haiku = Math.round(totals.llm * 0.27);

  return {
    available: true,
    buckets,
    totals,
    previous: {
      github: Math.round(totals.github * (0.84 + rand() * 0.1)),
      llm: Math.round(totals.llm * (0.72 + rand() * 0.12)),
    },
    models: [
      { service: "llm", name: "gpt-4o-mini", calls: mini },
      { service: "llm", name: "claude-haiku", calls: haiku },
      { service: "llm", name: "gemini-flash", calls: Math.max(0, totals.llm - mini - haiku) },
    ],
  };
}

export function sampleBilling(stats: StatsResponse): SampleBilling {
  const rand = seeded(hash32(`billing:${stats.range}`));
  const users = Math.max(stats.totals.users, 120);
  const paid = Math.max(6, Math.round(users * 0.074));
  const n = stats.buckets.length;
  const start = Math.max(1, Math.round(paid * 0.82));

  let floor = 0;
  const series = stats.buckets.map((_, i) => {
    const value = Math.round(start + ((paid - start) * (i + 1)) / n + (rand() - 0.5) * 0.8);
    floor = Math.max(floor, value);
    return i === n - 1 ? paid : Math.min(floor, paid);
  });

  const pro = Math.max(1, Math.round(paid * 0.62));
  const team = Math.max(1, Math.round(paid * 0.26));
  const enterprise = Math.max(0, paid - pro - team);

  return {
    available: true,
    series,
    totals: {
      paid,
      free: users - paid,
      netNew: paid - (series[0] ?? start),
      conversionPct: Math.round((paid / users) * 1000) / 10,
    },
    plans: [
      { plan: "Pro", users: pro },
      { plan: "Team", users: team },
      { plan: "Enterprise", users: enterprise },
    ].filter((p) => p.users > 0),
  };
}
