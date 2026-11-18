import type { NextRequest } from "next/server";
import { invalidateStatsCache } from "@/components/lib/admin/analytics";
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
import { fail, json, requireAdmin } from "@/components/lib/admin/guard";
import { getGitHubSnapshot } from "@/components/lib/admin/github";
import { countUsers, getUser, listActivity, listUsers, logActivity, reconcileGitHubUsernames, setBlocked } from "@/components/lib/admin/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET   /api/admin/users           ->  UsersResponse
 * GET   /api/admin/users?id=<id>   ->  UserDetailResponse (that account's own activity + live GitHub data)
 * PATCH /api/admin/users           body BlockRequest  ->  BlockResponse (writes an audit row on the account)
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const id = req.nextUrl.searchParams.get("id");

    if (id !== null) {
      if (!isValidId(id)) return fail(400, "bad_request", "That is not a valid account id.");
      const user = await getUser(id, { strict: true });
      if (!user) return fail(404, "not_found", "Account not found.");
      const [activity, github] = await Promise.all([
        listActivity(id, { strict: true, limit: ACTIVITY_LIMIT }),
        user.githubUsername ? getGitHubSnapshot(user.githubUsername) : Promise.resolve(null),
      ]);
      return json<UserDetailResponse>({ user, activity, github, updatedAt: Date.now() });
    }

    // Throttled to once per 5 minutes per server; a failure here must never break the list.
    void reconcileGitHubUsernames().catch(() => undefined);

    const [users, total] = await Promise.all([listUsers({ strict: true, limit: USERS_LIMIT }), countUsers({ strict: true })]);
    return json<UsersResponse>({ users, total, updatedAt: Date.now() });
  } catch (error) {
    console.error("[admin-users] GET failed", error);
    return fail(500, "users_failed", "Could not load accounts.");
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req, { mutation: true });
  if (denied) return denied;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  const request = parseBlockRequest(body);
  if (!request) return fail(400, "bad_request", "Bad request.");

  try {
    const user = await setBlocked(request.id, request.blocked, request.reason, { strict: true });
    if (!user) return fail(404, "not_found", "Account not found.");

    const logged = await logActivity(request.id, request.blocked ? ADMIN_ACTIONS.blocked : ADMIN_ACTIONS.unblocked, request.blocked ? user.blockReason : request.reason);
    invalidateStatsCache();
    return json<BlockResponse>({ user: logged ? { ...user, actions: user.actions + 1 } : user });
  } catch (error) {
    console.error("[admin-users] PATCH failed", error);
    return fail(500, "block_failed", "Could not update that account.");
  }
}
