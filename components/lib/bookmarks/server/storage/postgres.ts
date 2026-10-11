import { BOOKMARK_KINDS, type BookmarkKind, type BookmarkRecord } from "@/components/types/bookmarks";
import type { BookmarkStorage } from "./types";

/**
 * Postgres storage that works with ANY Postgres client: you hand it one function,
 * `sql(text, params)`, which runs a query with $1, $2, ... placeholders and resolves with the
 * rows. See `connect.ts` for ready-made snippets (pg, Prisma, Neon).
 *
 * This file imports no database package, so it compiles even if you use none.
 * The table is created automatically on first use (or run `sql/bookmarks.sql` yourself).
 */

export type SqlRow = Record<string, unknown>;
export type SqlQuery = (text: string, params: readonly unknown[]) => Promise<SqlRow[]>;

export const BOOKMARKS_TABLE = "oshunt_bookmark_items";

export const SCHEMA_SQL: readonly string[] = [
  `create table if not exists ${BOOKMARKS_TABLE} (
     user_id   text        not null,
     id        text        not null,
     kind      text        not null,
     item_key  text        not null,
     title     text        not null,
     url       text        not null,
     snapshot  jsonb       not null,
     saved_at  timestamptz not null default now(),
     primary key (user_id, id)
   )`,
  `create index if not exists ${BOOKMARKS_TABLE}_user_saved
     on ${BOOKMARKS_TABLE} (user_id, saved_at desc)`,
];

const SELECT = `select id, kind, item_key, title, url, snapshot,
  to_char(saved_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as saved_at
  from ${BOOKMARKS_TABLE}`;

const UPSERT_SET = `kind = excluded.kind, item_key = excluded.item_key, title = excluded.title,
  url = excluded.url, snapshot = excluded.snapshot, saved_at = excluded.saved_at`;

function toRecord(row: SqlRow): BookmarkRecord {
  const snapshot = typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot;
  const kind = String(row.kind);
  if (!(BOOKMARK_KINDS as readonly string[]).includes(kind)) throw new Error(`Unknown bookmark kind in database: ${kind}`);
  return {
    id: String(row.id),
    kind: kind as BookmarkKind,
    key: String(row.item_key),
    title: String(row.title),
    url: String(row.url),
    snapshot: (snapshot ?? {}) as BookmarkRecord["snapshot"],
    savedAt: String(row.saved_at),
  };
}

export function createPostgresStorage(sql: SqlQuery): BookmarkStorage {
  let schemaReady: Promise<void> | null = null;

  /** Create the table once per server instance. Retries on the next call if it failed. */
  function ready(): Promise<void> {
    if (!schemaReady) {
      schemaReady = (async () => {
        for (const statement of SCHEMA_SQL) await sql(statement, []);
      })().catch((err) => {
        schemaReady = null;
        throw err;
      });
    }
    return schemaReady;
  }

  const serialize = (r: BookmarkRecord) => ({
    id: r.id,
    kind: r.kind,
    item_key: r.key,
    title: r.title,
    url: r.url,
    snapshot: r.snapshot,
    saved_at: r.savedAt,
  });

  return {
    async list(userId) {
      await ready();
      const rows = await sql(`${SELECT} where user_id = $1 order by saved_at desc, id asc`, [userId]);
      return rows.map(toRecord);
    },

    async count(userId) {
      await ready();
      const rows = await sql(`select count(*) as n from ${BOOKMARKS_TABLE} where user_id = $1`, [userId]);
      return Number(rows[0]?.n ?? 0);
    },

    async get(userId, id) {
      await ready();
      const rows = await sql(`${SELECT} where user_id = $1 and id = $2`, [userId, id]);
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async put(userId, record) {
      await ready();
      await sql(
        `insert into ${BOOKMARKS_TABLE} (user_id, id, kind, item_key, title, url, snapshot, saved_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
         on conflict (user_id, id) do update set ${UPSERT_SET}`,
        [userId, record.id, record.kind, record.key, record.title, record.url, JSON.stringify(record.snapshot), record.savedAt],
      );
    },

    async putMany(userId, records) {
      if (records.length === 0) return;
      await ready();
      await sql(
        `insert into ${BOOKMARKS_TABLE} (user_id, id, kind, item_key, title, url, snapshot, saved_at)
         select $1::text, x.id, x.kind, x.item_key, x.title, x.url, x.snapshot, x.saved_at
         from jsonb_to_recordset($2::jsonb) as x(
           id text, kind text, item_key text, title text, url text, snapshot jsonb, saved_at timestamptz)
         on conflict (user_id, id) do update set ${UPSERT_SET}`,
        [userId, JSON.stringify(records.map(serialize))],
      );
    },

    async delete(userId, id) {
      await ready();
      const rows = await sql(`delete from ${BOOKMARKS_TABLE} where user_id = $1 and id = $2 returning id`, [userId, id]);
      return rows.length > 0;
    },

    async deleteAll(userId, kind) {
      await ready();
      const rows = kind
        ? await sql(`delete from ${BOOKMARKS_TABLE} where user_id = $1 and kind = $2 returning id`, [userId, kind])
        : await sql(`delete from ${BOOKMARKS_TABLE} where user_id = $1 returning id`, [userId]);
      return rows.length;
    },
  };
}
