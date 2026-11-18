
# OSHunt admin rebuild: toolkit evaluation

Date: 2026-11-07. Method: read-only. **Nothing was installed, no code from any evaluated project was run, and no API key was created or used.**
Scope: the rebuilt owner-only admin (Next.js 16 App Router, React 19.2, TypeScript strict, Tailwind v4, the unified `radix-ui` package, Prisma 6 on Postgres/Neon, recharts 3, lucide-react v1).

## 0. How the facts were gathered, and what could not be verified

- **Repositories:** shallow, blob-less, no-checkout `git clone --depth 1` through the session's read-only git proxy, then `git show HEAD:<file>` for README, license, manifests and hook configs. Last-commit dates come from git itself.
- **npm packages:** `npm view <package>` (registry metadata only): version, license, last-modified date, `bin`, install scripts, dependency count. Queried: `@21st-dev/cli`, `@21st-dev/magic`, `@dietrichgebert/ponytail`, `impeccable`, `ui-ux-pro-max-cli`, `rea-agents`, `shadcn`, `@playwright/mcp`, `unlazy`. None of the nine declares a `preinstall`, `install` or `postinstall` script; that only means installing does not run code by itself, while running them with `npx` or enabling them as an agent plugin does.
- **Documentation pages:** WebFetch on the 21st.dev Magic repository, the shadcn MCP page and the Playwright MCP repository. WebFetch summarises pages with a small model, so wording from those three pages is a summary, not a quotation.
- **Not verified:** GitHub API-only data (stars, open issues, releases); whether any tool behaves as its README says at run time (nothing was executed); what 21st.dev's servers do with prompts; the repository `LeonxInx/unlazy` (see row 16).
- **Verdicts are my judgment for this task** (rebuilding one admin dashboard), not a rating of the projects.

## 1. Summary

Verdicts: **USED** = part of how this build was verified (sandbox only). **DEFER** = could help later, needs your approval to install. **SKIP** = not relevant to this task.

| # | Item | Type | Verdict | Why, in one line |
|---|---|---|---|---|
| 1 | 21st.dev CLI / Magic MCP | CLI + hosted MCP | SKIP | Needs a 21st.dev API key and sends prompts to their servers; generated components would fight `design.md`. |
| 2 | ponytail | Claude Code plugin (Node hooks) | SKIP | Hooks run on every turn and its goal (shortest code, no extra abstractions) pulls against a rebuild that needs a contract, tests and docs. |
| 3 | shadcn MCP / CLI | MCP + CLI | DEFER | Writes components into the project, and stock shadcn classes emit no CSS here until the `@theme` gap is fixed (section 3). |
| 4 | Figma MCP | Hosted MCP | SKIP | Connected in this session, but there is no Figma file for the admin, so nothing to read. |
| 5 | Playwright MCP | MCP server | DEFER | Playwright itself was used directly; the MCP adds an agent-facing layer you do not need yet. |
| 6 | Google Doc "WebDesign skills" | Link list | SKIP | Accessible; a title and four links, no instructions. |
| 7 | morluto/rea | MCP (reverse engineering) | SKIP | Analyses binaries and apps; unrelated to an admin dashboard. |
| 8 | Nutlope/hallmark | Design skill | SKIP | Builds themed landing pages from 50 themes; your admin already has its own identity. |
| 9 | pbakaus/impeccable | Design skill + CLI | DEFER | Best candidate for a second design check (`npx impeccable detect`), but running it downloads and executes package code. |
| 10 | nextlevelbuilder/ui-ux-pro-max-skill | Design skill + CLI | DEFER | The directives' design reference; not installed or run in this build (see section 3). |
| 11 | cathrynlavery/diagram-design | Skill (HTML + SVG diagrams) | SKIP | Nice for architecture diagrams; this build needs none. |
| 12 | blader/humanizer | Writing skill | SKIP | Rewrites prose; the admin has almost no marketing copy. |
| 13 | onyx-dot-app/onyx | Self-hosted app | SKIP | A knowledge-search platform (Docker); a different product category. |
| 14 | mvanhorn/last30days-skill | Research skill | SKIP | Searches Reddit, X and similar; no role in a UI build. |
| 15 | D4Vinci/Scrapling | Python library + MCP | SKIP | Web scraping; the admin scrapes nothing. |
| 16 | LeonxInx/unlazy | Unverified | SKIP | Could not be read (see below); the admin has no image galleries to lazy-load. |
| - | Playwright (library), axe-core, node:test via tsx, PGlite | Test tooling | USED | Sandbox-only verification; none of it was added to your project. |

## 2. Recommended minimal toolkit

For this project, nothing new needs to be installed. The admin runs on what the project already has: `radix-ui`, `recharts`, `lucide-react`, `jose`, `zod`, `prisma`, `clsx`, `tailwind-merge`.

Optional, each needing your approval first:

1. **Tests.** The tests I ran (39 `node:test` tests through `tsx`, a 19-step Playwright flow and an axe-core sweep) live in my sandbox, because they need stand-ins for Neon and e-mail. They are not in the zip. Adding them to your project means installing `tsx`, `playwright` and `axe-core`; say so and I will package them.
2. **A second design check.** `npx impeccable detect <dir or URL>` scans for common AI-design patterns. It is a read-only scan, but `npx` fetches and runs package code, so it counts as an installation.
3. **The shadcn CLI**, only after the optional `@theme inline` fix in `docs/ADMIN_HANDOFF.md` is applied.

## 3. Per-item notes

**1) 21st.dev CLI / Magic MCP.** `@21st-dev/cli` 1.18.0 (MIT, 2026-10-06) and `@21st-dev/magic` 0.2.3 (ISC, 2026-09-09, now a compatibility proxy for old configs). Purpose, per the npm descriptions: search, retrieve and install 21st.dev components from the terminal and configure the 21st MCP for your editor (`npx @21st-dev/cli@latest init --client claude`). It requires an API key from 21st.dev, passed as an `x-api-key` header or the `API_KEY_21ST` environment variable (older setups used `API_KEY`), and it forwards MCP messages to 21st.dev's servers; the page I read does not describe how that data is handled. Per the directives, no key was invented, requested or exposed. If you want it later: create the key yourself and keep it in an environment variable, never in a file that is committed.

**2) ponytail.** `DietrichGebert/ponytail` 5.3.3 (MIT, last commit 2026-10-29). Install: two separate prompts, `/plugin marketplace add DietrichGebert/ponytail` then `/plugin install ponytail@ponytail`. The Claude Code plugin registers `node` command hooks on `SessionStart`, `SubagentStart` and `UserPromptSubmit`. By default it also keeps a local record of each turn (cost, tokens, agent time, whether the tests pass) that feeds its "band" and "board" views, written as a per-project CSV under `~/.config/ponytail/band/`; an optional webhook is empty by default, and the README says everything stays on your machine by default. That is local code execution on every turn, which is a reason to review it before installing. Overlap: it pushes for the shortest solution and no unrequested abstractions, which is the opposite pressure from a rebuild that is meant to ship a shared contract, tests and a handoff document.

**3) shadcn MCP / CLI.** `shadcn` 4.23.0 (MIT, 2026-10-27, 32 runtime dependencies). `npx shadcn@latest mcp` lets an agent browse registries and install components; it writes into the project and needs no key for the default registry. **Finding that matters here:** your `app/globals.css` defines tokens only in `:root` and has no `@theme` block, so utilities such as `bg-primary`, `text-muted-foreground` and `border-border` generate no CSS in this project. Components pulled in by the shadcn CLI would render unstyled. The admin therefore owns its tokens (`app/admin/admin.css`, scoped to `.osa-root`) and ships a small shadcn-pattern kit (`components/admin/kit.tsx`) on the `radix-ui` package. The optional site-wide fix is described in `docs/ADMIN_HANDOFF.md`; it changes global CSS, so it needs your approval.

**4) Figma MCP.** The Figma tools are available in this session. No Figma file or URL was provided for the admin, so none was called.

**5) Playwright MCP.** `@playwright/mcp` 0.0.84 (Apache-2.0, 2026-11-03, 2 runtime dependencies); `claude mcp add playwright npx @playwright/mcp@latest`. It drives a browser through accessibility snapshots. Its own README states it is not a security boundary, lists `browser_run_code_unsafe` as equivalent to remote code execution, and allows all network origins by default. Playwright itself was used directly in the sandbox, which needs none of that.

**6) Google Doc "WebDesign skills".** `https://docs.google.com/document/d/1--1NiIw4dxEftYO6OUsBXDmkFo3q4FKqrMT5NnMeLq8/mobilebasic?pli=1` opened without a login. It contains a title and four links (threeui.com, tasteskill.dev, 21st.dev, gsap.com) and no instructions. Only 21st.dev is on your evaluation list; the other three were not evaluated.

**7) morluto/rea.** MIT, last commit 2026-11-07. `npx rea-agents setup` (a 49 MB npm package) registers an MCP server for reverse-engineering binaries, Electron and .NET apps and websites, and can optionally install Hopper. Unrelated to this task.

**8) Nutlope/hallmark.** MIT, last commit 2026-11-05, from Together AI. A design skill for Claude Code, Codex, Cursor and OpenCode with 50 themes for building pages. Its purpose is landing pages; it would replace the dark `#090909` + lime identity rather than extend it.

**9) pbakaus/impeccable.** Apache-2.0, `impeccable` 4.8.0 (2026-10-26), last commit 2026-11-06. `npx impeccable install` adds a hook that scans UI files an agent edits; `npx impeccable detect src/` and `npx impeccable detect <url>` scan a directory or a rendered page (the URL scan uses your installed Chrome or Edge). Its README describes 62 deterministic rules, no LLM and no API key. Useful as a second opinion on the finished admin. Not run here.

**10) nextlevelbuilder/ui-ux-pro-max-skill.** MIT, `ui-ux-pro-max-cli` 2.15.0 (2026-08-13), last commit 2026-11-05. A design-intelligence skill with a design-system generator; install via `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` + `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`, or `npm install -g ui-ux-pro-max-cli` and `uipro init --ai claude`. The directives name it as the design reference. **It was not installed or run in this build.** The design follows the directives' own design rules and your saved design taste, and is written down in `design.md`. If you install it, ask it to review the admin against `design.md`.

**11) cathrynlavery/diagram-design.** MIT, last commit 2026-11-06. Draws diagrams as one HTML + SVG file; install `npx skills add cathrynlavery/diagram-design`. Its `PRIVACY.md` says it has no server, accounts, analytics or telemetry. Not needed here.

**12) blader/humanizer.** MIT, last commit 2026-10-28. A skill that rewrites AI-sounding text, based on Wikipedia's "Signs of AI writing". Only touches prose.

**13) onyx-dot-app/onyx.** Last commit 2026-11-06. A self-hosted knowledge and search platform (Docker, Kubernetes; the quick start pipes an installer script into bash). Licence: MIT, except directories named `ee`, which carry a separate Onyx Enterprise License. Not an admin-dashboard tool.

**14) mvanhorn/last30days-skill.** MIT, last commit 2026-11-05. Searches Reddit, X, Hacker News and other sources; some sources need API keys and first-run setup installs extra command-line tools. No role in a UI build.

**15) D4Vinci/Scrapling.** BSD-3-Clause, last commit 2026-11-05. A Python scraping framework with stealth browsers, an MCP server and an agent skill. The admin has nothing to scrape.

**16) LeonxInx/unlazy.** Could not be verified: the anonymous clone failed with `could not read Username for 'https://github.com'` and the web fetch of the page failed, which is what a private, renamed or mistyped repository looks like. The npm package `unlazy` is a different, verifiable project: MIT, 2.0.1, last modified 2026-05-01, 1 runtime dependency, by `johannschopplich` ("Universal lazy loading library for placeholder images"). If that is the one you meant, the admin still has no use for it: its only images are small GitHub avatars, which the Radix `Avatar` fallback already handles.

## 4. Sources

- The directives file you attached ("CLAUDE CODE — ENGINEERING & DESIGN DIRECTIVES")
- [Google Doc: WebDesign skills](https://docs.google.com/document/d/1--1NiIw4dxEftYO6OUsBXDmkFo3q4FKqrMT5NnMeLq8/mobilebasic?pli=1)
- [21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp) · [shadcn MCP docs](https://ui.shadcn.com/docs/mcp) · [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) · [Nutlope/hallmark](https://github.com/Nutlope/hallmark) · [pbakaus/impeccable](https://github.com/pbakaus/impeccable) · [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) · [blader/humanizer](https://github.com/blader/humanizer)
- [morluto/rea](https://github.com/morluto/rea) · [onyx-dot-app/onyx](https://github.com/onyx-dot-app/onyx) · [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) · [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) · [LeonxInx/unlazy](https://github.com/LeonxInx/unlazy) (unreadable) · [npm: unlazy](https://www.npmjs.com/package/unlazy)
