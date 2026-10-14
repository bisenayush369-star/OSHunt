import type { NextRequest } from "next/server";
import { auth } from "@/components/lib/auth";
import { prisma } from "@/components/lib/prisma";
import type { SqlQuery } from "./storage/postgres";

/**
 * ─────────────────────────────────────────────────────────────────────────────────────
 *  THE ONLY FILE YOU NEED TO EDIT to plug the bookmarks into your app.
 * ─────────────────────────────────────────────────────────────────────────────────────
 *
 *  1) `getUserId`  Who is signed in?  Return a stable id string, or `null` when nobody is.
 *                  `null` => the API answers 401 and the page shows "Sign in".
 *
 *  2) `sql`        Which database?  Leave `null` and bookmarks are stored in a local JSON file
 *                  (`.data/bookmarks`). That is for local development only: it does NOT persist
 *                  on Vercel / serverless hosts, and the API refuses to start there until you
 *                  set `sql`.
 *
 *  Until you edit `getUserId`, the API uses an anonymous per-browser id so you can try
 *  everything locally. In production that fallback is OFF (it is only enabled when
 *  NODE_ENV !== "production" or BOOKMARKS_ALLOW_GUESTS=true).
 */

export interface BookmarksConnect {
  getUserId(req: NextRequest): Promise<string | null>;
  sql: SqlQuery | null;
}

export const connect: BookmarksConnect = {
  async getUserId() {
    const session = await auth();
    const user = session?.user as { id?: string | null; email?: string | null } | undefined;

    // Some auth providers expose a stable user id, while others only provide email.
    // Use the most reliable available identity so bookmark ownership stays consistent.
    return user?.id ?? user?.email ?? null;
  },

  sql: (text, params) => prisma.$queryRawUnsafe(text, ...(params as unknown[])) as Promise<Record<string, unknown>[]>,
};
