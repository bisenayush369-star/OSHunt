import type { ApiError } from "@/components/lib/admin/contract";

/** A failed call to /api/admin/**. `status` is 0 when the server could not be reached at all. */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }

  /** The server says this browser is not signed in (any more). */
  get signedOut(): boolean {
    return this.status === 401;
  }
}

export const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError";

/** The viewer's UTC offset in minutes EAST of UTC (India: 330). Sent as `?tz=` so buckets line up with their local days. */
export const viewerTzMinutes = (): number => Math.round(-new Date().getTimezoneOffset()) || 0;

/**
 * fetch() for the admin API: same-origin cookies, never cached, JSON in and out, and every failure turned
 * into an AdminApiError with words a person can read. Aborts are rethrown untouched so callers can ignore them.
 */
export async function adminFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : null), ...init.headers },
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new AdminApiError(0, "network", "Could not reach the server.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch (error) {
    if (isAbort(error)) throw error;
    /* an empty or non-JSON body is handled below */
  }

  if (!res.ok) {
    const problem = (typeof body === "object" && body !== null ? body : {}) as Partial<ApiError>;
    throw new AdminApiError(res.status, problem.error ?? "error", problem.message ?? (res.status === 401 ? "Sign in again." : `The server answered ${res.status}.`));
  }
  return body as T;
}

/** Words for any thrown value. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof AdminApiError) return error.message;
  return fallback;
}
