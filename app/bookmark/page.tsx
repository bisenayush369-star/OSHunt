import type { Metadata } from "next";
import { BookmarksView } from "@/components/bookmarks/BookmarksView";
import { parseBookmarkView } from "@/components/lib/bookmarks/view";

export const metadata: Metadata = {
  title: "Bookmark · OSHunt",
  description: "The repos and issues you saved, exactly as you saved them.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookmarkPage({ searchParams }: { searchParams: SearchParams }) {
  const view = parseBookmarkView(await searchParams);
  return <BookmarksView initialTab={view.tab} initialQuery={view.q} initialSort={view.sort} />;
}
