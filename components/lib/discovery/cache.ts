/**
 * Simple in-memory TTL cache. Deliberately NOT localStorage/sessionStorage —
 * this is a client component cache that lives for the tab's session, which
 * is exactly what's needed here: avoid re-hitting GitHub's tight rate limit
 * when a user flips back to a category or repo they already loaded, without
 * pretending data survives a refresh (it shouldn't — GitHub data goes stale).
 */
export class TtlCache<T> {
  private store = new Map<string, { data: T; at: number }>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.at > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, at: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.store.clear();
  }
}

export const categoryCache = new TtlCache<unknown>(5 * 60 * 1000);
export const detailCache = new TtlCache<unknown>(10 * 60 * 1000);
