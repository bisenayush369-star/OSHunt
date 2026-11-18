import { randomBytes } from "node:crypto";
import { prisma } from "@/components/lib/prisma";

/**
 * The admin's only door to the database. Server only.
 *
 * Why raw SQL: the dashboard needs GROUP BY bucketing and joins that Prisma's model API cannot express, and
 * raw SQL keeps working (with an honest "not connected" state) when a table such as ApiUsage has not been
 * migrated yet, where `prisma.apiUsage` would be undefined. Every value goes in as a parameter ($1, $2 ...),
 * never into the SQL text. Table and column names are Prisma's own (quoted, same case as the schema).
 */

export type Row = Record<string, unknown>;

export function q<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql, ...params);
}

export function exec(sql: string, ...params: unknown[]): Promise<number> {
  return prisma.$executeRawUnsafe(sql, ...params);
}

/** Postgres returns bigint / numeric as BigInt or string through some drivers. Always hand the UI a number. */
export const n = (value: unknown): number => {
  const v = typeof value === "bigint" ? Number(value) : typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(v) ? v : 0;
};

/** SQL for "this epoch-ms parameter as a UTC timestamp", comparable with Prisma's `timestamp` columns. */
export const ts = (param: string): string => `(to_timestamp(${param}::float8 / 1000.0) AT TIME ZONE 'UTC')`;

/** Same shape as a Prisma cuid: "c" + 24 hex characters. Raw inserts have to supply their own id. */
export const newId = (): string => `c${randomBytes(12).toString("hex")}`;

/** The table (or column) does not exist yet: not migrated. Prisma reports it as P2021 / P2022 / P2010+42P01. */
export function isMissingRelation(error: unknown): boolean {
  const e = error as { code?: string; message?: string; meta?: { code?: string; message?: string } } | null;
  if (!e) return false;
  if (e.code === "P2021" || e.code === "P2022") return true;
  if (e.code === "P2010" && (e.meta?.code === "42P01" || e.meta?.code === "42703")) return true;
  return /relation "[^"]+" does not exist|column "[^"]+" does not exist|\b42P01\b|\b42703\b/i.test(`${e.message ?? ""} ${e.meta?.message ?? ""}`);
}

/** Folds [{b, n}] rows into a dense array of `length` numbers (missing buckets are 0, out-of-range ignored). */
export function dense(rows: ReadonlyArray<{ b: unknown; n: unknown }>, length: number): number[] {
  const out = new Array<number>(length).fill(0);
  for (const row of rows) {
    const i = n(row.b);
    if (i >= 0 && i < length) out[i] += n(row.n);
  }
  return out;
}
