import { createHash, randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { connect } from "./connect";

export interface Caller {
  /** Stable id used to namespace the data. Never sent to the browser. */
  userId: string;
  /** Short one-way hash of `userId`, safe to send to the browser. */
  ownerKey: string;
  isGuest: boolean;
}

export const GUEST_COOKIE = "oshunt_guest";
const GUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Anonymous per-browser bookmarks: on while developing, off in production unless you opt in. */
export function guestsAllowed(): boolean {
  const flag = process.env.BOOKMARKS_ALLOW_GUESTS;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function ownerKeyOf(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

export async function resolveCaller(
  req: NextRequest,
): Promise<{ caller: Caller | null; applyCookie: (res: NextResponse) => void }> {
  const noop = () => {};

  const realId = await connect.getUserId(req);
  if (realId) {
    return { caller: { userId: realId, ownerKey: ownerKeyOf(realId), isGuest: false }, applyCookie: noop };
  }
  if (!guestsAllowed()) return { caller: null, applyCookie: noop };

  const existing = req.cookies.get(GUEST_COOKIE)?.value;
  const valid = existing !== undefined && GUEST_ID_RE.test(existing);
  const guestId = valid ? existing : randomUUID();
  const userId = `guest:${guestId}`;
  return {
    caller: { userId, ownerKey: ownerKeyOf(userId), isGuest: true },
    applyCookie: valid
      ? noop
      : (res) =>
          res.cookies.set(GUEST_COOKIE, guestId, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 400,
          }),
  };
}
