import { ADMIN_PATHS, type ApiError } from "@/components/lib/admin/contract";

/** Client-side transport. The only place the console calls fetch for /api/admin/**. */

export class AdminApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

export type Timed<T> = { data: T; ms: number; status: number; at: number };

type Init = Omit<RequestInit, "headers"> & { headers?: Record<string, string> };

export async function adminFetch<T>(url: string, init: Init = {}): Promise<Timed<T>> {
  const startedAt = performance.now();

  const res = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });

  const ms = Math.round(performance.now() - startedAt);

  if (res.status === 401) {
    window.location.assign(ADMIN_PATHS.login);
    throw new AdminApiError("Your session ended. Sign in again.", 401, "unauthorized");
  }

  const body = (await res.json().catch(() => null)) as T | ApiError | null;

  if (!res.ok) {
    const problem = body as ApiError | null;
    throw new AdminApiError(problem?.message ?? problem?.error ?? `Request failed (${res.status})`, res.status, problem?.error);
  }

  return { data: body as T, ms, status: res.status, at: Date.now() };
}

export const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
