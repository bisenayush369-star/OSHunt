# OSHunt admin: design

The single source of truth for how the admin looks and behaves. It is implemented by `app/admin/admin.css` (tokens and component classes) and `components/admin/kit.tsx` (React wrappers on Radix). When the code and this file disagree, fix one of them in the same commit.

## 1. Purpose and constraints

- A private console for one person. The only way in is the heart on the public page, then ID and password (`docs/ADMIN_HANDOFF.md`, section 3). Nothing links to it.
- It may be shown on a screen share. No secret ever reaches the screen (no API key, token, password or session value), and no screen looks broken when data is missing.
- Foundation: shadcn/ui patterns over Radix primitives (the unified `radix-ui` package). The project's `app/globals.css` has no `@theme` block, so stock shadcn colour utilities such as `bg-primary` or `text-muted-foreground` emit no CSS here. The admin therefore owns its tokens, scoped to `.osa-root`, and uses Tailwind only for layout, spacing and type size.

## 2. Principles

1. **One accent.** Lime is the only brand colour. It marks the primary series, the active tab or option, the focus ring, the primary button and the selected marker.
2. **Status is colour, icon and word.** Colour never carries meaning alone.
3. **Flat.** No gradients, glow, blur, glassmorphism or text shadows (there are none in the CSS). Depth is three surface steps and 1px lines. The chart area fill is a flat 12% lime.
4. **Numbers first.** Tabular monospace figures, round axis values, no decorative charts.
5. **Honest states.** Loading, empty, partly connected and failed are all designed. Each says what is wrong and what to do. Never a blank panel, never an invented number.
6. **Mobile first.** Designed at 320px, enhanced from 768px. No horizontal page scroll at any width.
7. **Calm motion.** Nothing moves unless it explains a change (section 9).
8. **No global "recent activity" feed.** Activity is shown per account (in the account sheet) and as a chart, never as a site-wide list.

## 3. Tokens

All defined in `app/admin/admin.css` as custom properties on `.osa-root` and `body.osa-body` (Radix portals render under `<body>`). Contrast ratios are against the page colour `#090909`, measured when the tokens were chosen.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--osa-page` | `#090909` | page background (also set on `<html>` so iOS overscroll is dark) | |
| `--osa-panel` | `#0f0f10` | panels and cards | |
| `--osa-raised` | `#161617` | row hover, raised items | |
| `--osa-popover` | `#1a1a1c` | sheets, dialogs, command menu | |
| `--osa-line` | `rgba(255,255,255,.08)` | hairlines | |
| `--osa-line-strong` | `rgba(255,255,255,.16)` | control borders | |
| `--osa-grid` | `rgba(255,255,255,.09)` | chart grid | |
| `--osa-ink` | `#ededee` | primary text | 17.0 |
| `--osa-ink-2` | `#b4b4b8` | secondary text | 9.6 |
| `--osa-ink-3` | `#8f8f96` | labels, captions | 6.2 |
| `--osa-ink-4` | `#6b6b72` | decoration only, **never text** | 3.8 |
| `--osa-lime` | `#a8ff3e` | accent | 16.2 |
| `--osa-lime-ink` | `#0b1200` | text on lime | |
| `--osa-lime-soft` / `-line` | `rgba(168,255,62,.12)` / `.3` | selected row tint / accent border | |
| `--osa-good` | `#0ca30c` | healthy | 5.9 |
| `--osa-warn` | `#fab219` | attention | 10.9 |
| `--osa-serious` | `#ec835a` | serious | 7.6 |
| `--osa-bad` / `--osa-bad-text` | `#d03b3b` / `#ff7b7b` | failure fill and border / failure text | 7.9 (text) |
| `--osa-series-2` | `#3987e5` | second chart series (GitHub calls) | |

Radii: panels 12px (`--osa-radius`), controls 8px (`--osa-radius-sm`), segmented control 10px with 7px inner buttons, pills 999px, phone bottom sheet 16px top corners.
Gutter: 16px, 24px from 768px. Page width: 1240px maximum, centred, with safe-area insets.

## 4. Type

- **Outfit** for interface text, **JetBrains Mono** for numbers, eyebrows, the terminal prompt and readouts. The admin reads the project's `--font-sans` and `--font-mono` and falls back to the system stack, so it never waits for a font.
- Body 14px / 1.5. Table text 13px. Mono eyebrows and table headers 11px, uppercase, 0.08em tracking. Readouts and the prompt 12px mono. Stat values 16px (18px from 640px).
- Numbers use `tabular-nums` (`.osa-num`, `.osa-hero-num`) so columns and live-updating values do not jitter.
- Form fields are 16px on phones (stops iOS zooming into them) and 14px from 768px.
- Router wording arrives in capitals ("INVALID OR DELETED API KEY"); `headline()` in `components/lib/admin/llm.ts` turns it into a sentence. Never show shouting capitals.

## 5. Layout

- **Top bar** (sticky): brand, three tabs (Overview, Accounts, LLM APIs), command-menu button (Ctrl or Cmd + K), sign out. A skip link jumps to `#main`.
- **Overview:** six tiles (Accounts, Active, Actions, Onboarded, Blocked, Paid) in 2 columns, then 3 from 640px, then 6 from 1280px. Below them, from 1024px, a 3-column grid: growth chart across two columns, API-calls chart and plans in the third; stacked on smaller screens. An LLM glance panel links to the LLM tab.
- **Accounts:** search, filter, sort. A table from 768px, a card list below it. Opening an account shows the sheet (section 6).
- **LLM APIs:** router summary (2 columns, 4 from 1024px), then one card per provider (1 column, 2 from 1024px), worst first. Each card says what its limit and usage are and what, if anything, to change.
- Section gaps are 16px, 20px from 768px.

## 6. Components

Classes live in `app/admin/admin.css`; React wrappers in `components/admin/kit.tsx`.

| Component | Class | Notes |
|---|---|---|
| Panel | `.osa-panel`, `-head`, `-body` | the only container; no nested boxes inside boxes |
| Button | `.osa-btn` + `--primary`, `--ghost`, `--danger`, `--danger-solid`, `--sm`, `--icon` | one primary per view; destructive actions confirm |
| Segmented control | `.osa-seg` (`--mono`) | range (1D, 1W, 1M, 6M) and metric choices; selected = lime fill |
| Tabs | `.osa-tabs`, `.osa-tab` | top-level navigation; `role="tablist"`, arrow keys |
| Tile | `.osa-tile` | KPI; a `<button>` when it opens something, otherwise a div; same top-aligned layout either way |
| Chip | `.osa-chip` + `--good`, `--warn`, `--serious`, `--bad`, `--lime`, `--mute` | always icon + word |
| Notice | `.osa-notice` + `--info`, `--warn`, `--bad` | inline messages; never a toast for something the person must read |
| Meter / bar | `.osa-meter`, `.osa-bar` | usage against a limit; turns warn at 80%, bad at 100%; the number is always printed next to it |
| Table / list | `.osa-table`, `.osa-list`, `.osa-row` | accounts; row hover `--osa-raised`, selected row lime tint |
| Sheet | `.osa-sheet--right` (480px), `--bottom` (phones, up to 88dvh) | account details; Radix Dialog, focus is trapped and returns to the row that opened it |
| Command menu | `.osa-cmd` | Ctrl/Cmd + K; jump to a screen, a provider or an account, change the chart range, refresh, sign out |
| Skeleton | `.osa-skel` | loading; same size as the content it stands for |
| Link | `.osa-link` | inline link, at least 24px tall (32px on touch) |

Icons are lucide, 16px, decorative (`aria-hidden`) unless they stand alone. lucide v1 removed brand icons: never import `Github`; use `FolderGit2`.

## 7. Charts

Recharts 3. Shared rules: dashed horizontal grid only (`3 4`), no vertical grid, no tick marks, x axis line only, y axis without a line, y ticks from `niceTicks()` (round numbers: 0, 5, 10, 15; at least 0 to 4; at most 4 intervals), tabular mono labels, `isAnimationActive={false}` on bars.

- **Growth** (card styled as a terminal: a lime `$` and a prompt such as `osh signups --last 1w`): area chart, lime 2px stroke, flat 12% lime fill, monotone curve, dot only on hover. Metric toggle: New accounts or Activity. Range toggle: 1D (24 hourly buckets), 1W (7 daily, the default), 1M (30 daily), 6M (26 weekly). A readout line shows the hovered bucket, or the current one marked "(so far)". A total, average and peak row sits under the chart. Buckets use the viewer's time zone.
- **API calls:** stacked bars, LLM in lime and GitHub in blue (`--osa-series-2`), with a failure chip when any call failed. Provider names come from the LLM section so "Most used" matches the cards.
- **Text alternatives:** each chart has `role="img"` with a label that states the unit, the window and the total, and a **Table** button that shows the same numbers as a real table. Failed or missing data shows a message in place of the chart, never an empty axis.
- Height: 200px on phones, 240px from 640px (usage chart 180px and 200px).

## 8. States

| State | What the person sees |
|---|---|
| Loading | skeletons shaped like the content |
| Refreshing | content stays; an "Updating…" caption and dimmed charts; no spinner over data |
| Empty | a sentence that says why ("Nobody signed up in this period.") and, where there is one, the next step |
| Not connected | a table or service the server cannot read shows "not connected" for that panel only; the rest keeps working |
| Failed | nothing loaded yet: a failure notice with **Try again**. A refresh or range change failed: a warning notice with **Try again**, and the last good numbers stay on screen |
| Offline or tab hidden | polling pauses and resumes by itself |
| Session ended (401) | the console is replaced by a "Session ended" screen that says to use the footer heart again; no data from the dead session stays on screen |
| Blocked account | a notice at the top of the account sheet |
| Unsaved change failed | the optimistic change rolls back and says "Not saved" |

## 9. Motion

- Colour transitions on controls: 120ms ease. Usage meters: width over 300ms. Loading skeletons: a 1.4s opacity pulse. Nothing else animates; there are no entrance animations, parallax or decorative loops.
- `prefers-reduced-motion: reduce` sets every animation and transition in the admin and its portals to ~0ms and disables smooth scrolling.

## 10. Accessibility rules

- Contrast: text at least 4.5:1 on its background (values in section 3); `--osa-ink-4` is never text.
- Focus: a 2px lime outline with 2px offset on every focusable element, keyboard only (`:focus-visible`). Where a clipped ring would be invisible (the command menu's search field inside a rounded dialog) the whole row shows an inset lime line instead.
- Targets: at least 24x24 CSS px everywhere; fine pointers get 36px buttons (30px small), touch gets 44px (40px small), segmented buttons 30x40 and 38x44.
- Names: a control's accessible name comes from its visible text, so voice control works (WCAG 2.5.3). Do not add an `aria-label` that differs from the visible text. Decorative avatars and icons are `aria-hidden`.
- Scrollable regions are focusable and labelled (the account sheet body is `role="region"` with `tabIndex=0`).
- Dialogs trap focus and return it to what opened them (`useRestoreFocus` when there is no Radix Trigger).
- Status is never colour alone. Charts have a text label and a table twin.
- Forced-colours mode: borders use `CanvasText`; the primary button and selected options use `Highlight`.
- Notices announce themselves: `role="alert"` for failures, `role="status"` for the rest. Every failed login reads the same ("Those details did not match.").

## 11. Do and don't

- Do put new colours in the token block first. Don't write a hex value in a component.
- Do use `.osa-*` classes for colour, borders and surfaces, and Tailwind for layout, spacing and type size. Don't use `bg-primary`, `text-muted-foreground`, `border-border` or similar: they emit nothing in this project.
- Do print the number next to every meter and chart. Don't rely on bar length.
- Do show a real reason when data is missing. Don't show zeros that are really "unknown".
- Don't add shadows, gradients, blur or animation for decoration.
- Don't add a second accent colour. A new series gets a colour from the data-viz palette, not from the brand.
- Don't put keys, tokens, secrets, raw provider responses or stack traces on screen. Provider text is shown as the router's own short wording, never as written by the provider.

## 12. What has been checked

Run in a sandbox against a stand-in database (PGlite instead of Neon), in Chromium only:

- axe-core (WCAG 2.0 A and AA, 2.1, 2.2 AA and best-practice rules): no violations on Overview, Accounts, LLM APIs, the account sheet, the command menu and the login page.
- No horizontal overflow and no interactive element under 24x24px at 320, 390, 768, 1024, 1440, 1920 and 2560px wide.
- A 19-step browser flow: hidden entry, sign-in, every range, search and filter, block and unblock with confirmation, Ctrl+K, Escape returning focus to the row, deep link, sign out, expired session, and reduced motion emulated (animations and transitions collapse).
- A database without the `ApiUsage`, `ApiProvider` and `Subscription` tables, and one with no rows, render their "not connected" and "empty" states with no console errors.

Not checked: Safari and Firefox, real phones and tablets, a screen reader by hand, forced-colours mode (written in CSS, never run), real Neon data, and large data sets (hundreds of accounts).

## 13. Changing the design

1. Change the token or class in `app/admin/admin.css`.
2. Update this file in the same commit.
3. Run `npx tsc --noEmit`, lint, `next build`, then look at the three screens at 390px and 1440px wide.
