import type { NextRequest } from "next/server";
import {
  ACTIVITY_LIMIT,
  ADMIN_ACTIONS,
  USERS_LIMIT,
  isValidId,
  parseBlockRequest,
  type BlockResponse,
  type UserDetailResponse,
  type UsersResponse,
} from "@/components/lib/admin/contract";
import { invalidateStatsCache } from "@/components/lib/admin/analytics";
import { getGitHubSnapshot } from "@/components/lib/admin/github";
import { fail, json, requireAdmin } from "@/components/lib/admin/guard";
import {
  countUsers,
  getUser,
  listActivity,
  listUsers,
  logActivity,
  reconcileGitHubUsernames,
  setBlocked,
} from "@/components/lib/admin/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET   /api/admin/users          -> UsersResponse
 * GET   /api/admin/users?id=<id>  -> UserDetailResponse (user + activity + GitHub snapshot)
 * PATCH /api/admin/users          -> BlockResponse, body { id, blocked, reason? }
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");

  try {
    if (id !== null) {
      if (!isValidId(id)) return fail(400, "invalid_id", "That is not a valid account id.");

      const user = await getUser(id, { strict: true });
      if (!user) return fail(404, "not_found", "Account not found.");

      const [activity, github] = await Promise.all([
        listActivity(id, { strict: true, limit: ACTIVITY_LIMIT }),
        user.githubUsername ? getGitHubSnapshot(user.githubUsername) : Promise.resolve(null),
      ]);

      return json<UserDetailResponse>({ user, activity, github, updatedAt: Date.now() });
    }

    // Best-effort and throttled; never blocks or fails the response.
    void reconcileGitHubUsernames().catch((error) => console.error("[admin/users] reconcile failed", error));

    const [users, total] = await Promise.all([
      listUsers({ strict: true, limit: USERS_LIMIT }),
      countUsers({ strict: true }),
    ]);
    return json<UsersResponse>({ users, total, updatedAt: Date.now() });
  } catch (error) {
    console.error("[admin/users] GET failed", error);
    return fail(500, "server_error", "Could not load accounts.");
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req, { mutation: true });
  if (denied) return denied;

  const input = parseBlockRequest(await req.json().catch(() => null));
  if (!input) return fail(400, "invalid_body", "Send { id, blocked, reason? }.");

  try {
    const user = await setBlocked(input.id, input.blocked, input.reason, { strict: true });
    if (!user) return fail(404, "not_found", "Account not found.");

    // Audit trail: the route owns it, the data layer stays side-effect free.
    const logged = await logActivity(
      input.id,
      input.blocked ? ADMIN_ACTIONS.blocked : ADMIN_ACTIONS.unblocked,
      input.blocked ? user.blockReason : undefined,
    );

    invalidateStatsCache(); // the client refreshes stats right after this; it must see totals.blocked change
    return json<BlockResponse>({ user: { ...user, actions: user.actions + (logged ? 1 : 0) } });
  } catch (error) {
    console.error("[admin/users] PATCH failed", error);
    return fail(500, "server_error", "Could not update the account.");
  }
}
