"use client";

import * as React from "react";
import { AlertDialog, Avatar as AvatarPrimitive, Dialog, VisuallyHidden } from "radix-ui";
import { CircleAlert, Info, LoaderCircle, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cx, initials } from "./format";

/**
 * The admin's small component kit. shadcn/ui patterns (Radix primitives, composable parts, `cn`, data
 * attributes) owned by the admin, styled by the tokens in app/admin/admin.css. See /design.md.
 * Nothing in here fetches data or knows about accounts or providers.
 */

/* ── Button ─────────────────────────────────────────────────────────────── */

export type ButtonVariant = "default" | "primary" | "ghost" | "danger" | "danger-solid";

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: "md" | "sm" | "icon";
  /** Shows a spinner, sets aria-busy and ignores clicks. The label stays so the width does not jump. */
  loading?: boolean;
};

export function Button({ variant = "default", size = "md", loading = false, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cx(
        "osa-btn",
        variant !== "default" && `osa-btn--${variant}`,
        size === "sm" && "osa-btn--sm",
        size === "icon" && "osa-btn--icon",
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ── Chip, count, status ────────────────────────────────────────────────── */

export type Tone = "neutral" | "lime" | "good" | "warn" | "serious" | "bad" | "mute";

/** Status is never colour alone: pass an icon and the chip always carries words. */
export function Chip({ tone = "neutral", icon: Icon, children, className, title }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span className={cx("osa-chip", tone !== "neutral" && `osa-chip--${tone}`, className)} title={title}>
      {Icon ? <Icon aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Red number badge (menu items that need the owner). Includes a spoken label. */
export function Count({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span className="osa-count" role="img" aria-label={`${n} ${label}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

/* ── Segmented control (radio semantics, arrow keys) ────────────────────── */

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode; title?: string; disabled?: boolean };

export function Segmented<T extends string>({ value, onChange, options, label, mono = false, className }: { value: T; onChange: (value: T) => void; options: readonly SegmentOption<T>[]; label: string; mono?: boolean; className?: string }) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const move = (from: number, step: 1 | -1) => {
    for (let i = 1; i <= options.length; i++) {
      const idx = (from + step * i + options.length * i) % options.length;
      if (!options[idx]!.disabled) {
        onChange(options[idx]!.value);
        refs.current[idx]?.focus();
        return;
      }
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={cx("osa-seg", mono && "osa-seg--mono", className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={o.disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tabs (top navigation) ──────────────────────────────────────────────── */

export type TabItem<T extends string> = { value: T; label: string; icon?: LucideIcon; badge?: React.ReactNode };

export function Tabs<T extends string>({ value, onChange, tabs, label, idPrefix }: { value: T; onChange: (value: T) => void; tabs: readonly TabItem<T>[]; label: string; idPrefix: string }) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const focusTab = (idx: number) => {
    const next = (idx + tabs.length) % tabs.length;
    onChange(tabs[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="osa-tabs">
      {tabs.map((t, i) => {
        const selected = t.value === value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-tab-${t.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${t.value}`}
            tabIndex={selected ? 0 : -1}
            className="osa-tab"
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                focusTab(i + 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                focusTab(i - 1);
              } else if (e.key === "Home") {
                e.preventDefault();
                focusTab(0);
              } else if (e.key === "End") {
                e.preventDefault();
                focusTab(tabs.length - 1);
              }
            }}
          >
            {Icon ? <Icon className="size-4" aria-hidden /> : null}
            {t.label}
            {t.badge}
          </button>
        );
      })}
    </div>
  );
}

/* ── Meter ──────────────────────────────────────────────────────────────── */

/** used / max as a bar. Over 100% stays full and turns red; from `warnAt` percent it turns amber. */
export function Meter({ value, max, label, warnAt = 80, className }: { value: number; max: number; label: string; warnAt?: number; className?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const tone = pct >= 100 ? "bad" : pct >= warnAt ? "warn" : "lime";
  return (
    <div className={cx("osa-meter", tone !== "lime" && `osa-meter--${tone}`, className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-valuetext={`${Math.round(pct)}% used`}>
      <i style={{ width: `${Math.min(100, Math.max(pct > 0 ? 2 : 0, pct))}%` }} />
    </div>
  );
}

/* ── Skeleton, spinner, empty, notice ───────────────────────────────────── */

export function Skeleton({ w, h = 14, className, radius }: { w?: number | string; h?: number | string; className?: string; radius?: number }) {
  return <span aria-hidden className={cx("osa-skel", className)} style={{ width: w ?? "100%", height: h, borderRadius: radius }} />;
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx("animate-spin", className)} aria-hidden />;
}

export function EmptyState({ icon: Icon, title, children, action, className }: { icon?: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {Icon ? <Icon className="size-6 osa-faint" aria-hidden /> : null}
      <p className="text-[15px] font-medium">{title}</p>
      {children ? <p className="osa-muted max-w-[46ch] text-[13px]">{children}</p> : null}
      {action}
    </div>
  );
}

const NOTICE_ICON: Record<"bad" | "warn" | "info", LucideIcon> = { bad: CircleAlert, warn: TriangleAlert, info: Info };

export function Notice({ tone = "info", title, children, action, className }: { tone?: "bad" | "warn" | "info"; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cx("osa-notice", `osa-notice--${tone}`, className)}>
      <Icon aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children ? <div className="osa-muted mt-0.5 text-[13px]">{children}</div> : null}
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────── */

export function Panel({ className, children, ...rest }: React.ComponentProps<"section">) {
  return (
    <section className={cx("osa-panel", className)} {...rest}>
      {children}
    </section>
  );
}

export function PanelHead({ title, hint, actions, id, className }: { title: React.ReactNode; hint?: React.ReactNode; actions?: React.ReactNode; id?: string; className?: string }) {
  return (
    <header className={cx("osa-panel-head", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold leading-tight">
          {title}
        </h2>
        {hint ? <p className="osa-faint mt-0.5 text-[12px]">{hint}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="osa-kbd">{children}</kbd>;
}

/* ── Field ──────────────────────────────────────────────────────────────── */

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} data-slot="input" className={cx("osa-input", className)} {...rest} />;
});

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => React.ReactNode }) {
  const id = React.useId();
  const noteId = `${id}-note`;
  const note = error || hint;
  return (
    <div>
      <label htmlFor={id} className="osa-label">
        {label}
      </label>
      {children({ id, "aria-describedby": note ? noteId : undefined, "aria-invalid": error ? true : undefined })}
      {note ? (
        <p id={noteId} className={cx("mt-1.5 text-[12px]", error ? "text-[var(--osa-bad-text)]" : "osa-faint")}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      aria-hidden="true"
      className="inline-grid flex-none place-items-center overflow-hidden rounded-full border border-[var(--osa-line-strong)] bg-[var(--osa-raised)]"
      style={{ width: size, height: size }}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" referrerPolicy="no-referrer" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback delayMs={src ? 400 : 0} className="osa-mono text-[11px] font-medium text-[var(--osa-ink-2)]" style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}>
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

/* ── Focus: give it back when a dialog closes ──────────────────────────── */

/**
 * Radix returns focus to a dialog's Trigger. These dialogs open from state (a table row, the command menu), so
 * there is no Trigger and focus would fall to <body>. This remembers what had focus when the dialog opened and
 * puts it back on close. If that element is gone, focus goes to <main id="main"> so keyboard users carry on from
 * the content. If another dialog took over meanwhile (a command opened an account sheet) it leaves focus alone.
 */
export function useRestoreFocus() {
  const opener = React.useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      const el = opener.current && opener.current.isConnected && opener.current !== document.body ? opener.current : null;
      const others = document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
      if (Array.from(others).some((dialog) => !(el && dialog.contains(el)))) return;
      (el ?? document.getElementById("main"))?.focus();
    },
  };
}

/* ── Drawer: right side panel on wide screens, bottom sheet on phones ───── */

export function Drawer({ open, onOpenChange, side, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; side: "right" | "bottom"; title: string; description: string; children: React.ReactNode }) {
  const focus = useRestoreFocus();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-osa-portal className="osa-overlay" />
        <Dialog.Content data-osa-portal data-slot="drawer" className={cx("osa-sheet", `osa-sheet--${side}`)} {...focus}>
          <VisuallyHidden.Root>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>
          </VisuallyHidden.Root>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DrawerClose({ label = "Close" }: { label?: string }) {
  return (
    <Dialog.Close asChild>
      <Button variant="ghost" size="icon" aria-label={label}>
        <X />
      </Button>
    </Dialog.Close>
  );
}

/* ── Confirm dialog (destructive actions always ask) ────────────────────── */

export function Confirm({ open, onOpenChange, title, description, confirmLabel, cancelLabel = "Cancel", tone = "danger", busy = false, onConfirm, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string; cancelLabel?: string; tone?: "danger" | "primary"; busy?: boolean; onConfirm: () => void; children?: React.ReactNode }) {
  const focus = useRestoreFocus();
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay data-osa-portal className="osa-overlay" />
        <AlertDialog.Content data-osa-portal className="osa-dialog" {...focus}>
          <AlertDialog.Title className="text-[17px] font-semibold leading-snug">{title}</AlertDialog.Title>
          <AlertDialog.Description className="osa-muted mt-1.5 text-[14px]">{description}</AlertDialog.Description>
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button disabled={busy}>{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <Button variant={tone === "danger" ? "danger-solid" : "primary"} loading={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Words for screen readers only. */
export function SrOnly({ children }: { children: React.ReactNode }) {
  return <VisuallyHidden.Root>{children}</VisuallyHidden.Root>;
}
