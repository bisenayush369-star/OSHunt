"use client";

import type { ReactNode } from "react";
import type { BookmarkRecord } from "@/components/types/bookmarks";

/**
 * THE ONE FILE TO EDIT if you want saved ISSUES to look exactly like the issue cards on your Hunt page.
 *
 * I could not see your Hunt page, so saved issues are drawn with a ready-made card (`IssueRow`) that
 * shows the same kind of information. If you want pixel-for-pixel the same card, return your own
 * Hunt card component here. The bookmark's `snapshot` is the exact issue object your card was
 * given when you clicked save, so you can pass it straight in:
 *
 *   import { IssueCard } from "@/components/hunt/IssueCard";   // <- your Hunt card
 *   import type { Issue } from "@/components/types/hunt";      // <- your issue type
 *
 *   export const renderIssue: RenderIssue = (record) => (
 *     <IssueCard issue={record.snapshot as unknown as Issue} />
 *   );
 *
 * Inside your card, use <BookmarkButton kind="issue" item={issue} /> for the save button: on this
 * page it shows as "saved" and a click removes the bookmark (with Undo).
 *
 * Leave it as `null` to use the built-in card.
 */

export interface IssueRenderContext {
  /** Position in the list (0-based). */
  index: number;
  /** Removes this bookmark, with an Undo toast. */
  remove: () => void;
}

export type RenderIssue = (record: BookmarkRecord, context: IssueRenderContext) => ReactNode;

export const renderIssue: RenderIssue | null = null;
