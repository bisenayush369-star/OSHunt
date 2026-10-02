export function normalizeBookmarkUrl(value: string): string {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return ""

  const sansQuery = raw.replace(/[?#].*$/, "")

  try {
    const url = new URL(
      sansQuery.startsWith("http://") || sansQuery.startsWith("https://")
        ? sansQuery
        : `https://${sansQuery}`
    )

    url.hash = ""
    url.search = ""
    url.pathname = url.pathname.replace(/\/+$/, "") || "/"
    const withoutTrailingSlash = url.toString().replace(/\/$/, "")
    return withoutTrailingSlash
  } catch {
    return sansQuery.replace(/\/+$/, "")
  }
}

export function isSameBookmarkUrl(a?: string, b?: string): boolean {
  return normalizeBookmarkUrl(a ?? "") === normalizeBookmarkUrl(b ?? "")
}
