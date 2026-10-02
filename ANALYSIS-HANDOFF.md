# ANALYSIS-HANDOFF.md: add the Analysis page to OSHunt

Audience: GitHub Copilot agent mode. Read this whole file before changing code. Do the tasks in section 5 in order. If something under "verify" does not match the real codebase, stop and report it instead of guessing.

## 1. What this is

OSHunt's Discovery page finds useful repos, but beginners don't know how to actually contribute to them. The Analysis page closes that gap.

Flow: Discovery repo card, then an **Analyze** button, then `/analysis/[owner]/[repo]`. The page starts analyzing as soon as it opens (no form, no input). It shows a plain-English guide to the repo, and a repo-scoped chat agent sits beside it (a bottom sheet on mobile). Users can also open `/analysis`, paste a repo link and jump to the same page.

It does not add a backend. It reuses the two routes GitLense already uses: `/api/analyze` and `/api/chat`. Everything else is frontend.

Decisions already made by the product owner. Do not change them:

1. One repo at a time.
2. Results appear automatically on arrival.
3. Output is in very simple words for beginners. The page always sends `expertiseLevel: "Explorer"`.
4. The chat agent talks only about that repo.
5. The Analysis page must feel like part of the same product as GitLense, but must not be a copy of it.

This bundle replaces the earlier `analysis-feature` bundle (which had its own routes and a Prisma model). Do not use both.

## 2. Files in this bundle

| Path | Put it at | Job |
|---|---|---|
| `app/analysis/[owner]/[repo]/page.tsx` | same path | The page (client component wrapped in `RequireAuth`). Hero with live stats, sticky section nav, readiness dial, checklist steps, repo map, key files, beginner issues, stack, closing card, and the chat |
| `app/analysis/page.tsx` | same path | Entry page at `/analysis`: paste a repo link (owner/repo, full URL, or .git form) or pick an example or a repo analyzed earlier in this tab, then go to the analysis page |
| `components/analysis/RepoMap.tsx` | same path | Lazy folder explorer. Opens along the route to the recommended start files and pins them |
| `components/analysis/BeginnerIssues.tsx` | same path | Live open beginner issues in Tabs (free to take or claimed). "Explain it to me" hands the issue to the chat |

## 3. How it works

1. The page reads `owner` and `repo` from the URL and validates them with `^(?!\.+$)[\w.-]{1,100}$` (this blocks `.` and `..`).
2. It calls `POST /api/analyze` with `{ repoUrl, expertiseLevel: "Explorer" }` and caches the result in `sessionStorage` under `oshunt:analysis:<owner/repo>`. A ref guard stops React Strict Mode from calling the API twice in dev.
3. The response is either `{ result }` (structured) or `{ raw }` (markdown fallback). Both are handled.
4. The hero, stats, readiness dial and sections fill in from `result`. The readiness score is computed in the browser from `result.metadata` (last update, license, open issues, stars). It is never produced by the model.
5. `howToRun` and `howToContribute` arrive as free text. The page splits them into steps by line, or by sentence, and turns any inline `code` that looks like a command into a copyable block.
6. Checklist progress is saved in `localStorage` under `oshunt:done:<owner/repo>:run` and `:change`.
7. `RepoMap` and `BeginnerIssues` call the public GitHub API directly from the browser (unauthenticated, so about 60 requests per hour per IP). Results are cached in module-level Maps. If GitHub rate-limits, they show a clear message.
8. Chat: typing reveal, stop button, follow-up chips. Other sections can hand a question to the chat through `ask(text, ctx)`. `ctx` (for example the issue body) is sent to `/api/chat` but not shown in the visible message. On mobile, `ask` also opens the chat sheet.

### Contracts this page relies on (verify against the real routes)

`POST /api/analyze` returns `{ result: Result }` or `{ raw: string }`, and `{ error }` on failure:

```ts
interface Result {
  purpose: string
  techStack: string[]
  startFiles: { path: string; why: string }[]
  howToRun: string
  howToContribute: string
  architecture?: string | null
  framework?: string | null
  repositoryType?: "single-package" | "monorepo" | null
  metadata?: { stars?: number; forks?: number; license?: string | null; lastPushed?: string | null; openIssues?: number; primaryLanguage?: string | null }
}
```

`POST /api/chat` receives `{ repoUrl, analysis: string, messages: { role: "user" | "assistant"; content: string }[], expertiseLevel: "Explorer" }`. The page reads the reply defensively from `reply`, `response`, `message` or `answer`. Replace that with the one real field name once confirmed.

After each successful call the page dispatches `window.dispatchEvent(new CustomEvent("usage:updated"))`, copied from GitLense so usage counters refresh. Confirm that is the right event name.

## 4. Hard rules

1. Never run Prisma in Edge Middleware. Middleware must also not turn `/api/analyze` or `/api/chat` into HTML redirects for signed-out calls (return plain 401).
2. Design system: background `#090909`, lime `#a8ff3e`, Outfit font, card surfaces `#0a0a0a` with `#1a1a1a` borders, shadcn/ui plus Tailwind. Icons are inline SVGs only. No emojis, no external icon libraries.
3. Do not edit the GitLense page or its API routes unless a task below says so. If `/api/analyze` is missing a field this page needs, report it first.
4. Keep `prefers-reduced-motion` handling, 44px touch targets and visible focus rings.
5. No new dependencies beyond the shadcn components listed in task 2.
6. No secrets in code or logs.

## 5. Tasks (in order)

1. **Copy files** into the project at the paths in section 2.
2. **Install shadcn components** that are missing: `npx shadcn@latest add tabs progress accordion tooltip skeleton sheet` (also needs `button`, `input`, `badge`, `card`).
3. **Fix imports (verify first).** The page imports `Navbar` from `@/components/ui/Navbar` (default export), `RequireAuth` from `@/components/auth/RequireAuth` (named export) and `react-markdown`. Match what the GitLense page imports and correct any path that differs.
4. **Verify the two API contracts** in section 3. Adjust the page, not the routes. If `metadata` or `forks` is not returned, the related stats and readiness items simply do not render. Report which are missing so the owner can decide whether to add them to `/api/analyze`.
5. **Add the Analyze button on Discovery.** Find the Discovery page component that renders repo cards (the page with the category bar and shadcn DropdownMenu filters). Add a link on each card: `<Link href={`/analysis/${owner}/${name}`}>Analyze</Link>`. Match existing card button styling, 44px minimum height, lime hover and focus, inline SVG only. Stop the click from also triggering the card's own handler.
6. **Auth and middleware.** The page is wrapped in `RequireAuth`. Confirm `/analysis/*` is also treated like the other signed-in pages in middleware, and that rule 1 in section 4 holds. The entry page at `/analysis` is not wrapped in `RequireAuth`; ask the owner whether it should be.
7. **Navbar offset.** The sticky section nav uses `top-16` and sections use `scroll-mt-32`. Set these to the real Navbar height.
8. **Verify.** Run `npx tsc --noEmit`, lint and `next build`. Fix only errors caused by this feature.

## 6. Acceptance checks

1. Signed in, click Analyze on a Discovery card. The page opens, the hero shows a scanning state, then fills with the summary, stats and sections.
2. Reload the same repo in the same tab. It appears instantly from `sessionStorage` with no new `/api/analyze` call.
3. Signed out: the user is sent to sign-in, not shown a broken page.
4. `/analysis/x/does-not-exist-123` shows an error card with a working "Try again".
5. `/analysis/../x` and names made only of dots show the "not a valid GitHub repository" message and make no API call.
6. Tick checklist steps, reload: progress is kept. "Reset" clears it.
7. Repo map opens along the route to the start files and shows "start here" pins. Beginner issues load, unclaimed ones in the first tab.
8. "Explain it to me" on an issue sends the question to the chat (opening the sheet on mobile) and the answer types in. Stop halts it.
9. Responsive at 375, 768, 1024 and 1440 px: no horizontal scroll, section nav scrolls sideways and keeps the active chip visible, chat is a bottom sheet below `lg` and a sticky side panel from `lg`.
10. With reduced motion on, all animations are off.

## 7. Known gaps (report, don't silently fix)

1. Never executed. Expect small type or import fixes.
2. GitHub calls from `RepoMap` and `BeginnerIssues` are unauthenticated and can hit the browser rate limit. A later option is to route them through the server with the existing GitHub auth helper. Do that only if asked.
3. Each new session's first open of a repo counts as one analysis against the user's usage. Whether auto-run on open should consume usage is a product decision. Do not add pricing or plan messaging.
4. Readiness thresholds are simple heuristics (30 and 180 days, 100 stars). Folder notes in the repo map come from a static name dictionary, not the AI.
5. The travelling chat border uses `@property` and needs a recent browser. Older browsers just show no border.
6. Chat answers depend on how `/api/chat` handles long messages. Issue text is appended to the question, so confirm the route does not cut it off.
