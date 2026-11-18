/**
 * Compatibility path. The admin's data layer now lives in components/lib/admin/store.ts.
 *
 * Your sign-in code (components/lib/auth.ts) imports `isBlocked` from this path, and other routes may import
 * `logActivity` from it. This file re-exports everything the old file offered (and the new names), so nothing
 * changes for those callers.
 *
 * When convenient: point those imports at "@/components/lib/admin/store" and delete this file.
 */
export * from "@/components/lib/admin/store";
