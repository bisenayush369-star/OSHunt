import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BOOKMARK_KINDS, type BookmarkKind, type BookmarkRecord } from "@/components/types/bookmarks";
import type { BookmarkStorage } from "./types";

/**
 * Local JSON-file storage: one file per user under `.data/bookmarks` (override with
 * BOOKMARKS_DATA_DIR). Writes are atomic (temp file + rename) and serialised per user.
 *
 * DEVELOPMENT ONLY: it needs a writable, persistent disk and a single server process.
 * Use the SQL storage (see connect.ts) for anything deployed.
 */

function looksLikeRecord(value: unknown): value is BookmarkRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.key === "string" &&
    typeof r.title === "string" &&
    typeof r.url === "string" &&
    typeof r.savedAt === "string" &&
    typeof r.snapshot === "object" &&
    r.snapshot !== null &&
    (BOOKMARK_KINDS as readonly string[]).includes(r.kind as string)
  );
}

export function createFileStorage(
  dir: string = process.env.BOOKMARKS_DATA_DIR || path.join(process.cwd(), ".data", "bookmarks"),
): BookmarkStorage {
  const locks = new Map<string, Promise<unknown>>();

  // Hash the user id for the file name: any id (even one with odd characters) is path-safe.
  const fileOf = (userId: string) =>
    path.join(dir, `${createHash("sha256").update(userId).digest("hex").slice(0, 40)}.json`);

  async function read(file: string): Promise<BookmarkRecord[]> {
    let text: string;
    try {
      text = await fs.readFile(file, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    try {
      const parsed = JSON.parse(text) as { items?: unknown };
      return Array.isArray(parsed.items) ? parsed.items.filter(looksLikeRecord) : [];
    } catch {
      // Corrupt file: keep it for inspection and start fresh instead of failing forever.
      await fs.rename(file, `${file}.corrupt-${Date.now()}`).catch(() => undefined);
      return [];
    }
  }

  async function write(file: string, items: BookmarkRecord[]): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ version: 1, items }), "utf8");
    await fs.rename(tmp, file);
  }

  /** Run `fn` after every earlier operation on the same file has finished. */
  function locked<T>(file: string, fn: () => Promise<T>): Promise<T> {
    const previous = locks.get(file) ?? Promise.resolve();
    const run = previous.then(fn, fn);
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    locks.set(file, tail);
    void tail.then(() => {
      if (locks.get(file) === tail) locks.delete(file);
    });
    return run;
  }

  const newestFirst = (a: BookmarkRecord, b: BookmarkRecord) =>
    a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : a.id < b.id ? -1 : 1;

  return {
    async list(userId) {
      return (await read(fileOf(userId))).sort(newestFirst);
    },

    async count(userId) {
      return (await read(fileOf(userId))).length;
    },

    async get(userId, id) {
      return (await read(fileOf(userId))).find((r) => r.id === id) ?? null;
    },

    put(userId, record) {
      const file = fileOf(userId);
      return locked(file, async () => {
        const items = (await read(file)).filter((r) => r.id !== record.id);
        items.push(record);
        await write(file, items);
      });
    },

    putMany(userId, records) {
      const file = fileOf(userId);
      return locked(file, async () => {
        const incoming = new Set(records.map((r) => r.id));
        const items = (await read(file)).filter((r) => !incoming.has(r.id));
        await write(file, [...items, ...records]);
      });
    },

    delete(userId, id) {
      const file = fileOf(userId);
      return locked(file, async () => {
        const items = await read(file);
        const next = items.filter((r) => r.id !== id);
        if (next.length === items.length) return false;
        await write(file, next);
        return true;
      });
    },

    deleteAll(userId, kind?: BookmarkKind) {
      const file = fileOf(userId);
      return locked(file, async () => {
        const items = await read(file);
        const next = kind ? items.filter((r) => r.kind !== kind) : [];
        if (next.length === items.length) return 0;
        await write(file, next);
        return items.length - next.length;
      });
    },
  };
}
