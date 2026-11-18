# Where every file goes

For GitHub Copilot and for you. Date: 2026-11-09. Read this before touching any file.

## The one rule

**The root of the zip is the root of your repo.** Every file goes to the same relative path inside your repo. Nothing is renamed, moved or merged.

- If a file already exists at that path, replace it completely. Do not merge old and new.
- 48 files are in the zip: 34 replace a file you already have and 14 are new.
- 20 old files are deleted (section 5).
- No other file in your repo is edited. The files the admin depends on are listed in section 3 and must stay as they are.

**If you are Copilot, work in this order:** (1) copy each file from the zip to the same path; section 2 lists them. (2) Delete the 20 files in section 5. (3) Run the two checks in section 7. (4) Then follow `docs/ADMIN_HANDOFF.md`. Do not move, rename, merge or tidy any file. If you want to add something that is not in section 2, section 6 says where it goes. If that does not settle it, stop and ask the owner.

## 1. The final layout

```
your-repo/
├─ design.md                                 NEW      design source of truth
├─ docs/
│  ├─ ADMIN_HANDOFF.md                       NEW      what changed, env vars, tables, behaviour
│  ├─ FILE_PLACEMENT.md                      NEW      this file
│  ├─ FILE_MANIFEST.sha256                   NEW      checksums, to check the files landed
│  ├─ TOOLKIT_EVALUATION.md                  NEW      the tool evaluation
│  └─ llmRouter.v3-to-final.diff             NEW      reading material only
├─ prisma/
│  └─ admin-additions.prisma                 NEW      optional snippet, not a schema file (see section 2)
├─ app/
│  ├─ admin/                                          the pages
│  │  ├─ admin.css                           NEW
│  │  ├─ layout.tsx                          REPLACE
│  │  ├─ page.tsx                            REPLACE
│  │  ├─ login/page.tsx                      REPLACE
│  │  └─ lib/store.ts                        REPLACE  one-line re-export, keep it
│  └─ api/admin/                                      the four routes
│     ├─ gate/route.ts                       REPLACE
│     ├─ stats/route.ts                      REPLACE
│     ├─ users/route.ts                      REPLACE
│     └─ llm/route.ts                        NEW
└─ components/
   ├─ SecretHeart.tsx                        REPLACE  the footer heart
   ├─ admin/                                          browser side: 18 files
   └─ lib/
      ├─ llmRouter.ts                        REPLACE  your router v3 plus four patches
      └─ admin/                                       server side: 12 files (contract.ts is shared)
```

## 2. Every file

"Runs in": **server** = never sent to the browser. **browser** = starts with `"use client"`. **shared** = plain module imported by browser files, with no server-only imports.

### Pages, routes and styles

| Path | Action | Runs in | What it does |
|---|---|---|---|
| `app/admin/admin.css` | NEW | style | every admin token (`--osa-*`) and component class (`.osa-*`); imported by `app/admin/layout.tsx` |
| `app/admin/layout.tsx` | REPLACE | server | deliberately bare: imports `admin.css` and returns its children |
| `app/admin/page.tsx` | REPLACE | server | the dashboard page; `notFound()` unless the owner cookie is valid |
| `app/admin/login/page.tsx` | REPLACE | server | the sign-in page; `notFound()` unless the 10-minute knock cookie is present; already signed in goes straight to the dashboard |
| `app/admin/lib/store.ts` | REPLACE | server | one line: re-exports `components/lib/admin/store.ts`. **Keep it:** your `components/lib/auth.ts` imports `isBlocked` from this path |
| `app/api/admin/gate/route.ts` | REPLACE | server | POST `{step:"knock"}` (the heart), POST `{step:"login",id,password}`, DELETE (sign out) |
| `app/api/admin/stats/route.ts` | REPLACE | server | GET `?range=24h\|7d\|30d\|6m&tz=<minutes east of UTC>`: the Overview numbers |
| `app/api/admin/users/route.ts` | REPLACE | server | GET list, GET `?id=` detail, PATCH block or unblock |
| `app/api/admin/llm/route.ts` | NEW | server | GET LLM status: limits, usage, what to change. Never carries a secret |
| `components/SecretHeart.tsx` | REPLACE | browser | the footer heart; a click performs the knock, then goes to `/admin/login` |

### Browser side: `components/admin/`

| File | Action | Runs in | What it does |
|---|---|---|---|
| `api.ts` | REPLACE | shared | the one `fetch` helper for `/api/admin/*`: same-origin cookies, `AdminApiError` for failures (status 0 when the server cannot be reached), `viewerTzMinutes` for `?tz=` |
| `charts.tsx` | REPLACE | browser | `GrowthChart` (area), `UsageChart` (bars), `Sparkline` and `Delta`, on recharts. Every chart has a table twin |
| `command-menu.tsx` | REPLACE | browser | the command menu: go to a screen, change the range, jump to a provider, open an account, refresh, sign out. `console.tsx` opens it on Ctrl or Cmd + K |
| `console.tsx` | REPLACE | browser | the shell: top bar, the three screens, the account sheet and the command menu. It owns the state that crosses screens (range, selected account, highlighted provider), the sync status and the "Session ended" screen |
| `format.ts` | REPLACE | shared | number, date, duration and axis-tick helpers, plus `cx`, which is your `cn` from `components/lib/utils` re-exported so admin files import one helper module |
| `hooks.ts` | REPLACE | browser | `useNow`, `useMediaQuery`, `usePageVisible`, `useOnline`, `useStoredState`, all on `useSyncExternalStore`, so nothing browser-dependent renders on the server |
| `kit.tsx` | NEW | browser | the admin's own components on Radix: Button, Chip, Count, Segmented, Tabs, Meter, Skeleton, Spinner, EmptyState, Notice, Panel, PanelHead, Kbd, Input, Field, Avatar, Drawer, DrawerClose, Confirm, SrOnly and `useRestoreFocus`. It fetches nothing and knows nothing about accounts or providers |
| `llm-panel.tsx` | REPLACE | browser | the LLM APIs screen: per provider, its limit, the last 24 hours and the one thing to change. Providers are matched by NAME. It shows only the names of `.env` variables, never a key, a URL or provider-written text |
| `llm-state.tsx` | NEW | shared | one look (colour, icon, word) per LLM state, used by Overview and the LLM page |
| `login-form.tsx` | REPLACE | browser | the second step of the only way in: trades an ID and password for the 2-hour session. Every wrong answer reads the same and no field is echoed back |
| `overview.tsx` | REPLACE | browser | the Overview screen: attention first (only when something needs the owner), then the numbers, the growth chart, API usage and a glance at the LLM APIs. No global activity feed |
| `poll.ts` | NEW | shared | `startLoop`, a self-scheduling load loop: each failure doubles the wait, a success resets it, and clean-up aborts the request in flight |
| `scope.tsx` | REPLACE | browser | `AdminRoot`, the admin's root element. The dashboard and the sign-in form render it themselves (not `layout.tsx`), so a stranger's 404 carries none of it. While mounted it puts `osa-body` on `<body>` and a dark background on `<html>`, so the dialogs and the sheet that Radix renders under `<body>` get the tokens |
| `types.ts` | NEW | shared | the props between the shell and the screens |
| `use-admin-sync.ts` | REPLACE | browser | the console's data: one hook, three loops (numbers, accounts, LLM status). All three pause while the tab is hidden, the browser is offline or the session has ended |
| `use-user-detail.ts` | REPLACE | browser | one account's activity and live GitHub data |
| `user-sheet.tsx` | REPLACE | browser | the account sheet: details, GitHub, activity, block and unblock |
| `users-panel.tsx` | REPLACE | browser | the Accounts screen: search, filter, sort, table or cards |

### Server side: `components/lib/admin/` and the router

| File | Action | Runs in | What it does |
|---|---|---|---|
| `components/lib/admin/analytics.ts` | REPLACE | server | the Overview numbers and chart buckets; 5-second cache |
| `components/lib/admin/billing.ts` | REPLACE | server | paid accounts, the plan split and the conversion, read from `Subscription` |
| `components/lib/admin/contract.ts` | REPLACE | shared | the typed contract and request parsers used by both sides. Must stay free of server-only imports |
| `components/lib/admin/credentials.ts` | REPLACE | server | checks ID and password together, in constant time. Node runtime only: import it from route handlers, never from middleware or `proxy.ts` |
| `components/lib/admin/db.ts` | NEW | server | parameterised raw-SQL helpers; recognises "table not migrated" |
| `components/lib/admin/github.ts` | REPLACE | server | live GitHub data for the account sheet; uses `GITHUB_TOKEN` if set |
| `components/lib/admin/guard.ts` | REPLACE | server | `requireAdmin`, origin check, `json`, `fail`, `clientIp` |
| `components/lib/admin/llm.ts` | REPLACE | server | builds the LLM status from the router, `ApiProvider` and `ApiUsage` |
| `components/lib/admin/rate-limit.ts` | REPLACE | server | in-memory limiter for sign-in and knocks. Per server instance: a speed bump, not a guarantee |
| `components/lib/admin/session.ts` | REPLACE | server | the two signed cookies, `osh_knock` (10 min) and `osh_admin` (2 h). Edge-safe (`jose` only), so middleware or `proxy.ts` may import it |
| `components/lib/admin/store.ts` | REPLACE | server | accounts and activity: list, detail, block and unblock, audit row |
| `components/lib/admin/usage.ts` | REPLACE | server | writes (`trackUsage`, `recordApiUsage`) and reads `ApiUsage` |
| `components/lib/llmRouter.ts` | REPLACE | server | your router v3 plus four patches (`docs/llmRouter.v3-to-final.diff` shows them) |

### Documents and the optional snippet

| Path | Action | What it is |
|---|---|---|
| `design.md` | NEW | design source of truth, at the repo root |
| `docs/ADMIN_HANDOFF.md` | NEW | what changed, env vars, tables, behaviour, what was and was not tested |
| `docs/FILE_PLACEMENT.md` | NEW | this file |
| `docs/FILE_MANIFEST.sha256` | NEW | SHA-256 of every other file in the zip |
| `docs/TOOLKIT_EVALUATION.md` | NEW | the tool evaluation the directives asked for |
| `docs/llmRouter.v3-to-final.diff` | NEW | the exact router changes; reading material, nothing imports it |
| `prisma/admin-additions.prisma` | NEW | a snippet with one optional model, `LlmCache`. Prisma does not read this file, because your schema is `prisma/backend/schema.prisma`. Copy the model into that schema only if you want a shared router cache |

## 3. Files already in your repo that the admin uses

They must exist and must not be edited. Two of them, marked "not seen", were not in the zips you sent, so I could not read them. For those two I only know what the router imports from them.

| Your file | What the admin takes from it | Taken by |
|---|---|---|
| `components/lib/prisma.ts` | `prisma` (the Prisma client) | `components/lib/admin/db.ts`, `components/lib/llmRouter.ts` |
| `components/lib/utils.ts` | `cn` | `components/admin/format.ts` |
| `components/lib/emailAlert.ts` (not seen) | `sendApiLimitAlert(name, used, max)` | `components/lib/llmRouter.ts`; your v3 already imported it |
| `components/lib/repoIntelligence/agent/tools.ts` (not seen) | the type `ToolDefinition` | `components/lib/llmRouter.ts`; your v3 already imported it |
| `app/globals.css` | `--font-sans` and `--font-mono` (Outfit and JetBrains Mono) | `app/admin/admin.css`, with fallbacks |
| `prisma/backend/schema.prisma` | the tables `User`, `Activity`, `ApiUsage`, `Subscription`, `GitHubConnection`, `ApiProvider` | `components/lib/admin/*`, by raw SQL |
| `package.json` | `next`, `react`, `radix-ui`, `recharts`, `lucide-react`, `jose` | the admin files. No new packages are needed |

## 4. Files in your repo that use the admin

They must keep working, and with these files they do.

| Your file | What it imports or relies on | What keeps it working |
|---|---|---|
| `components/lib/auth.ts` | `isBlocked` from `@/app/admin/lib/store` | `app/admin/lib/store.ts` re-exports the same function. Do not delete that file |
| `components/ui/footer.tsx` | `{ SecretHeart }` from `@/components/SecretHeart`, used as `<SecretHeart />` | same export name, same usage |
| `components/ui/ConditionalFooter.tsx` | nothing; it hides the footer when the path starts with `/admin` | no change needed |
| any file that calls the router | `@/components/lib/llmRouter` | all 14 exports have exactly the signatures they had in your v3 |
| any file that calls `trackUsage` or `recordApiUsage` | `@/components/lib/admin/usage` | all 4 exports have exactly the signatures they had in your earlier file |
| any file that calls `logActivity`, `isBlocked`, `listUsers`, `setBlocked` and so on | `@/app/admin/lib/store` or `@/components/lib/admin/store` | both paths export every name the old store offered, and every argument list that worked still works. Two types are more exact: `logActivity` now returns a boolean (true when the row was saved) instead of nothing, and `User` is now `AdminUser`, which adds `onboarded` and `paid` |

Of the files that touch the admin I could see `components/lib/auth.ts`, `components/ui/footer.tsx` and `components/ui/ConditionalFooter.tsx`. The last three rows cover files I could not see: for those I compared the exports, not the callers.

## 5. Delete these 20 files

| Delete | Why it is safe |
|---|---|
| `app/admin/console.css` | old styles; the admin now uses `app/admin/admin.css` |
| `app/admin/lib/analytics.ts` | an older, separate version of the numbers code; now `components/lib/admin/analytics.ts` |
| `app/admin/lib/session.ts` | an older, separate version of the cookie code (cookies `osh_admin` and `osh_gate`); now `components/lib/admin/session.ts` |
| `app/api/admin/login/route.ts` | old sign-in route; now `gate` with `step:"login"` |
| `app/api/admin/metrics/route.ts` | old numbers route; now `stats` |
| `components/admin/area-chart.tsx`, `bars-chart.tsx`, `donut.tsx`, `radar.tsx`, `sparkline.tsx`, `trend-chart.tsx`, `chart-core.ts` | old hand-drawn charts; now `charts.tsx` (recharts) |
| `components/admin/kpi-cards.tsx`, `kpi-strip.tsx` | old tiles; the tiles are now in `overview.tsx` |
| `components/admin/face.tsx` | old decorative component; nothing in the new code uses it |
| `components/admin/sample-data.ts` | old made-up sample numbers; the new admin shows real data or an honest empty state |
| `components/admin/sync-chip.tsx` | old status chip; the status is now part of `console.tsx` |
| `LLM_ROUTER_CHANGES.md`, `docs/changes-to-your-existing-files.diff` | notes from the earlier router delivery; replaced by `docs/ADMIN_HANDOFF.md` and `docs/llmRouter.v3-to-final.diff` |
| `prisma/llm-cache-addition.prisma` | replaced by `prisma/admin-additions.prisma` (same model) |

The last two rows may not exist in your repo. Skip any file that is already gone.

I applied the zip and these deletions to a copy of the files you sent, and no remaining file mentions any deleted module.

## 6. Rules for placing new admin code later

1. A browser file may import only `contract.ts` from `components/lib/admin/`. Every other file there reads the database or secrets and is server-only.
2. A new admin API route goes in `app/api/admin/<name>/route.ts`. Start it with `requireAdmin` from `guard.ts` (only `gate` does not). Add its types to `contract.ts` first.
3. A new screen or UI piece goes in `components/admin/`, styled with the `.osa-*` classes from `app/admin/admin.css`. The screens render the admin's wrapper, `AdminRoot` from `scope.tsx`, themselves.
4. A new page under `app/admin/` checks the cookie first (`isAdmin()` then `notFound()`, as `page.tsx` does). Leave `layout.tsx` bare: it must add no title, element or class, so a stranger's 404 shows nothing of the admin.
5. A new server helper goes in `components/lib/admin/`. `credentials.ts` is Node-only: never import it from middleware or `proxy.ts`. `session.ts` is edge-safe.
6. Do not put admin files anywhere else: not `lib/`, not `components/ui/`.

## 7. Check that everything landed

Run these from the repo root, right after unzipping and before you commit (git may change line endings on Windows, which changes the checksums). They use Node, so they work on Windows, macOS and Linux.

**Every file matches the zip.** The last line must say `all files match`.

```bash
node -e "const fs=require('fs'),c=require('crypto');let bad=0;for(const l of fs.readFileSync('docs/FILE_MANIFEST.sha256','utf8').split(/\r?\n/).filter(Boolean)){const i=l.indexOf('  ');const h=l.slice(0,i),p=l.slice(i+2);let ok=false;try{ok=c.createHash('sha256').update(fs.readFileSync(p)).digest('hex')===h}catch{}if(!ok){bad++;console.log('DIFFERENT OR MISSING:',p)}}console.log(bad?bad+' file(s) wrong':'all files match')"
```

On Linux or Git Bash, `sha256sum -c docs/FILE_MANIFEST.sha256` does the same job. On macOS the equivalent is `shasum -a 256 -c docs/FILE_MANIFEST.sha256`.

**The old files are gone.** It must print nothing but `delete check done`.

```bash
node -e "for(const f of ['app/admin/console.css','app/admin/lib/analytics.ts','app/admin/lib/session.ts','app/api/admin/login/route.ts','app/api/admin/metrics/route.ts','components/admin/area-chart.tsx','components/admin/bars-chart.tsx','components/admin/chart-core.ts','components/admin/donut.tsx','components/admin/face.tsx','components/admin/kpi-cards.tsx','components/admin/kpi-strip.tsx','components/admin/radar.tsx','components/admin/sample-data.ts','components/admin/sparkline.tsx','components/admin/sync-chip.tsx','components/admin/trend-chart.tsx','LLM_ROUTER_CHANGES.md','docs/changes-to-your-existing-files.diff','prisma/llm-cache-addition.prisma'])if(require('fs').existsSync(f))console.log('STILL THERE:',f);console.log('delete check done')"
```

Then run the commands in `docs/ADMIN_HANDOFF.md`, section 2, step 6.

## 8. If a build error appears

| The error says | It means | Fix |
|---|---|---|
| `Module not found` for `./emailAlert` or `@/components/lib/emailAlert` | your `emailAlert.ts` is missing, or does not export `sendApiLimitAlert` | the router needs `sendApiLimitAlert(name, used, max)` from `components/lib/emailAlert.ts`; your v3 needed it too |
| `Module not found` for `@/app/admin/lib/store` | the one-line re-export was deleted | copy `app/admin/lib/store.ts` from the zip again |
| `Can't resolve './face'` (or `./area-chart`, `./kpi-cards`, `./donut`, and so on) | an old file in `components/admin` was not overwritten and still imports a deleted sibling | copy every file in `components/admin/` from the zip again, then delete the old ones in section 5 |
| `has no exported member` for a name from the old admin (`getRealMetrics`, `checkAdminId`, `createGate`, `loadSubscriptions`, `AnimatedNumber`, `RangeSwitch` and similar) | a file outside the admin imports an old internal; none of the files you sent does | stop and ask the owner. Do not re-create the old name. The full list is in `docs/ADMIN_HANDOFF.md`, section 5 |
| `/admin` is a 404 even after signing in | `ADMIN_ID`, `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` is missing, or the secret is under 32 characters | `docs/ADMIN_HANDOFF.md`, section 6 |
| a panel says "not connected" | its table is not migrated | `docs/ADMIN_HANDOFF.md`, section 7 |
