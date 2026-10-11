import { TOAST_MS } from "./config";

/**
 * A tiny toast store (no library needed). `toast()` can be called from anywhere in the browser;
 * `<BookmarkToaster />` renders whatever is in here.
 */

export type ToastTone = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  /** Run something (Undo, Retry). The toast closes afterwards. */
  onClick?: () => void;
  /** Or navigate somewhere (Sign in, View). */
  href?: string;
}

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
  action?: ToastAction;
  /** Milliseconds. The timer pauses while the toast is hovered or focused. */
  duration: number;
}

export interface ToastInput {
  tone?: ToastTone;
  message: string;
  description?: string;
  action?: ToastAction;
  duration?: number;
}

const MAX_VISIBLE = 3;
const EMPTY: readonly ToastItem[] = [];

let toasts: readonly ToastItem[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

let toasterCount = 0;
let warnedNoToaster = false;

function emit(): void {
  for (const listener of [...listeners]) listener();
}

/** <BookmarkToaster /> calls this while it is mounted (used only for a helpful dev warning). */
export function registerToaster(): () => void {
  toasterCount++;
  return () => {
    toasterCount--;
  };
}

export function toast(input: ToastInput): number {
  if (
    !warnedNoToaster &&
    toasterCount === 0 &&
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    warnedNoToaster = true;
    console.warn(
      "[bookmarks] A toast was shown but <BookmarkToaster /> is not mounted, so nobody can see it " +
        "(Undo / Retry / Sign in would be invisible). Add <BookmarkToaster /> to app/layout.tsx.",
    );
  }
  const tone = input.tone ?? "info";
  const item: ToastItem = {
    id: nextId++,
    tone,
    message: input.message,
    description: input.description,
    action: input.action,
    duration: input.duration ?? (tone === "error" ? TOAST_MS.error : TOAST_MS.info),
  };
  // The same message again replaces the old copy instead of stacking up.
  toasts = [...toasts.filter((t) => !(t.message === item.message && t.tone === tone)), item].slice(-MAX_VISIBLE);
  emit();
  return item.id;
}

export function dismissToast(id: number): void {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getToasts = (): readonly ToastItem[] => toasts;
export const getServerToasts = (): readonly ToastItem[] => EMPTY;

/** For tests. */
export function resetToastsForTests(): void {
  toasts = EMPTY;
  listeners.clear();
}
