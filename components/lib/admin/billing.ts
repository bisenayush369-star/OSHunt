import { prisma } from "@/components/lib/prisma";
import type { BillingSection, PlanSlice } from "./contract";

/**
 * Paid users. THIS FILE IS THE ONLY SEAM to your billing data. If your app stores plans
 * differently (a `plan` column on User, a Payment table, Razorpay/Stripe objects), rewrite
 * loadSubscriptions() to return the same Sub[] shape and nothing else needs to change.
 *
 * Definition used everywhere: a user is PAID at time t when they have a subscription with
 * startedAt <= t and (endedAt is null or endedAt > t), whose plan is not "free" and whose
 * status is not incomplete / trialing / unpaid. Keep endedAt up to date from your webhook.
 */

export type Sub = { userId: string; plan: string; status: string | null; startedAt: Date; endedAt: Date | null };

type Table = { findMany(args: Record<string, unknown>): Promise<unknown[]> };
type Loaded = { ok: true; subs: Sub[] } | { ok: false; reason: string };

const FREE_PLANS = new Set(["free", "none", ""]);
const NOT_PAID_STATUS = new Set(["incomplete", "incomplete_expired", "trialing", "unpaid"]);
const MAX_ROWS = 50_000;

function subscriptionTable(): Table | null {
  const table = (prisma as unknown as Record<string, unknown>).subscription as Table | undefined;
  return table && typeof table.findMany === "function" ? table : null;
}

const select = { userId: true, plan: true, status: true, startedAt: true, endedAt: true } as const;

export async function loadSubscriptions(where?: Record<string, unknown>): Promise<Loaded> {
  const table = subscriptionTable();
  if (!table) {
    return { ok: false, reason: "The Subscription table is not set up yet. Add the model from prisma/admin-additions.prisma and migrate." };
  }
  try {
    const rows = (await table.findMany({ where, select, take: MAX_ROWS })) as Sub[];
    return { ok: true, subs: rows };
  } catch (error) {
    console.error("[admin-billing] read failed", error);
    return { ok: false, reason: "Could not read the Subscription table. Check that the migration has run." };
  }
}

export function isPaidAt(sub: Sub, at: number): boolean {
  if (FREE_PLANS.has(sub.plan.trim().toLowerCase())) return false;
  if (sub.status && NOT_PAID_STATUS.has(sub.status.toLowerCase())) return false;
  return sub.startedAt.getTime() <= at && (sub.endedAt === null || sub.endedAt.getTime() > at);
}

export function paidUserIds(subs: Sub[], at: number): Set<string> {
  const ids = new Set<string>();
  for (const sub of subs) if (isPaidAt(sub, at)) ids.add(sub.userId);
  return ids;
}

/** Ids of everyone paid right now, or null when billing is not connected. */
export async function loadPaidUserIds(): Promise<Set<string> | null> {
  const loaded = await loadSubscriptions();
  return loaded.ok ? paidUserIds(loaded.subs, Date.now()) : null;
}

/** Is this one user paid right now? A targeted query, cheap enough for the detail sheet. */
export async function isUserPaid(userId: string): Promise<boolean> {
  const loaded = await loadSubscriptions({ userId });
  return loaded.ok ? paidUserIds(loaded.subs, Date.now()).size > 0 : false;
}

export function buildBillingSection(
  loaded: Loaded,
  win: { start: number; bucketMs: number; bucketCount: number; now: number; totalUsers: number },
): BillingSection {
  if (!loaded.ok) return { available: false, reason: loaded.reason };

  const { subs } = loaded;
  const { start, bucketMs, bucketCount, now, totalUsers } = win;

  const series = Array.from({ length: bucketCount }, (_, i) =>
    paidUserIds(subs, i === bucketCount - 1 ? now : start + (i + 1) * bucketMs).size,
  );
  const paid = paidUserIds(subs, now).size;
  const paidAtStart = paidUserIds(subs, start).size;

  const perPlan = new Map<string, Set<string>>();
  for (const sub of subs) {
    if (!isPaidAt(sub, now)) continue;
    const key = sub.plan.trim() || "paid";
    (perPlan.get(key) ?? perPlan.set(key, new Set()).get(key)!).add(sub.userId);
  }
  const plans: PlanSlice[] = [...perPlan].map(([plan, ids]) => ({ plan, users: ids.size })).sort((a, b) => b.users - a.users);

  return {
    available: true,
    series,
    totals: {
      paid,
      free: Math.max(0, totalUsers - paid),
      netNew: paid - paidAtStart,
      conversionPct: totalUsers > 0 ? Math.round((paid / totalUsers) * 1000) / 10 : 0,
    },
    plans,
  };
}
