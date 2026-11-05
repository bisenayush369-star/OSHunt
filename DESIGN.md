---
version: alpha
name: OSHunt Hunt Issues
description: Dark, neutral, instrument-like UI for finding a GitHub issue worth taking, with GitLense as its sibling for understanding the repo behind it.
colors:
  background: "#090909"
  sidebar: "#0b0b0b"
  surface: "#0d0d0d"
  surface-raised: "#141414"
  text: "#ffffff"
  text-body: "#e5e5e5"
  text-muted: "#a3a3a3"
  brand: "#a8ff3e"
  brand-hover: "#bcff6a"
  on-brand: "#0a0a0a"
  good: "#34d399"
  warn: "#fbbf24"
  bad: "#f43f5e"
typography:
  display: { fontFamily: Outfit, fontSize: 42px, fontWeight: 600, lineHeight: 1.1, letterSpacing: -0.025em }
  title: { fontFamily: Outfit, fontSize: 18px, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.025em }
  body: { fontFamily: Outfit, fontSize: 13.5px, fontWeight: 400, lineHeight: 1.6 }
  button: { fontFamily: Outfit, fontSize: 13.5px, fontWeight: 600 }
  eyebrow: { fontFamily: mono, fontSize: 11px, fontWeight: 600, letterSpacing: 0.14em }
rounded: { chip: 6px, control: 8px, row: 12px, panel: 16px }
spacing: { gutter: 16px, gutter-sm: 24px, sidebar: 300px, drawer: 600px, filters-drawer: 420px, picker: 860px }
components:
  button-primary: { backgroundColor: "{colors.brand}", textColor: "{colors.on-brand}", rounded: "{rounded.control}", height: 40px }
  panel: { backgroundColor: "{colors.surface}", rounded: "{rounded.row}" }
---

## Overview

Hunt is a tool you operate: pick a stack, read a dense list, open one issue, decide. So it is neutral and compact. Colour is almost absent: white and grey carry the interface, lime marks the single primary action, and green, amber and rose appear only as status (healthy repo, assigned, inactive or failed). Nothing glows.

The page never promises more than the backend does. A starting card runs exactly the stack it names, the toolbar repeats that stack, every row shows which stack found it when several are picked, and a failed search says so on the list instead of quietly showing less.

Source of truth is the code in `hunt/page.tsx` (one file, assembled from 17 parts while building). The mobile dock is its own file, `bottom-nav.tsx`. GitLense is `app/gitlense/page.tsx`, one client file, with its routes under `app/api/gitlense`. There is no Figma file for Hunt. Built on the project's shadcn primitives (Button, Badge, Card, Sheet, DropdownMenu, Tooltip) and Radix Dialog, Tailwind classes that compile in v3.4 and v4, Lucide icons and Outfit. Effects utilities cannot express live in one `HUNT_CSS` string.

## Colors

- **Surfaces.** `background` for the page, `sidebar` for the filters rail and every drawer, `surface` for cards and the results list, `surface-raised` for icon tiles. Borders are white at 6 to 8% (panels), 10 to 12% (controls), 20 to 25% on hover.
- **Text.** White for titles, `text-body` for copy, `text-muted` for everything secondary. The smallest text is 10.5px and is never darker than `text-muted`; all pairs are 4.5:1 or better on their real backgrounds (axe reports none).
- **Brand.** Lime is for the one primary action in view: Search, Open on GitHub, Done. It is also the tiny official-repo check and the radar blips. It is never a glow or a fill behind text.
- **Status.** Green dot: active repo or free to claim. Amber: assigned, incomplete results, API limit. Rose: inactive repo, failed search. Status always comes with a word, never colour alone.

## Typography

Outfit for everything people read, the system monospace for eyebrows, repo names, labels, commands and numbers. The hero is 30px on phones and 42px from `sm`; panel titles are 18px; issue titles 15px; body 13 to 13.5px; chips 12px. Inputs are 16px on phones so iOS does not zoom.

## Layout

- Desktop: a 300px filters rail on the left, results in `max-w-6xl`. Below `lg` the rail becomes a Filters sheet: a 420px right drawer from 640px, a bottom sheet below.
- The stack picker is its own dialog: full screen on phones, centred up to 860 by 740px from 640px. It opens above the Filters sheet without closing it.
- Issue details are a 600px right drawer, full width on phones. Views inside it (person, claim check, more in this repo, and the ten Learn guides) slide in and out, and Back and Escape step back before anything closes.
- Touch targets are 40px, 32px from `lg`; the whole issue row is the details button. Checked at 320, 375, 768, 1024 and 1440 with no horizontal scroll.
- Below `lg` a floating glass dock (`bottom-nav.tsx`) sits 12px above the bottom edge, or just above the home indicator. Its tabs are 52 to 56px high and it stays 448px wide on tablets. Hunt scrolls inside its own container, so that container is padded by the dock's height (88px plus the home indicator inset) and Load more is always reachable at the end of the list. A page that scrolls normally uses `<BottomNavSpacer />` instead; Hunt must not render both.

## Elevation & Depth

Flat panels with 1px borders. Depth comes from light: a cursor spotlight and four viewfinder corners on starting cards, a faint dot grid fading out behind the hero, a blurred backdrop behind drawers. The only shadows belong to menus and dialogs. Drawers and their backdrop sit at z-index 999 and 1000, above any sticky navbar, so the close button can never be covered.

### Motion

- Entrances 250 to 800ms on `cubic-bezier(.22,1,.36,1)`; drawers slide in 380ms and out in 240ms; inner views move 26px over 320ms. Press scales to 0.97 to 0.99.
- Starting points are dealt, not shown: cards come in 45ms apart, their logo tiles fade up just after, and Shuffle sends the old set out in 330ms before the new one arrives. The dock's pill slides behind the active tab over 420ms on `cubic-bezier(.16,1,.3,1)`.
- Progress is real: the server streams one line per search and per repo check, so a stack with more repos writes more lines, and the bar and "Step n of 3" move with those counts. Nothing is a timer pretending to work.
- Reduced motion: every keyframe is off, drawers appear at once, transitions drop to 0.01ms. Only the search spinner remains, slowed to 3 seconds.

## Shapes

Chips 6px, controls 8px, rows and cards 12px, dialogs 16px. On Hunt, avatars and dots are full circles and corner marks are 9px L-shapes. GitLense has no circles at all (see GitLense below).

## Components

- **Hero search.** One stack button and one Search button.
- **Starting points.** A pool of 51 combinations people really use together (Next.js with Prisma and PostgreSQL, React Native with Expo, Go with Kubernetes, Spring Boot with Hibernate). Eight are dealt at a time, one from each area (web, servers, data, mobile, systems, cloud, games) before any area repeats, and every page load deals a different set. Shuffle deals another set and skips what was just on screen while the area has other cards. Each card shows its picks' own logos in their brand colours, runs exactly those picks at Easy, and its sentence is written from the picks, so it never promises more than the search does. The first deal happens in the browser, so the server never renders a card the browser would replace; placeholders hold the space until then.
- **How a search works.** Four steps (pick your stacks, choose how hard, every repo is checked, claim it with confidence) that reveal as they scroll into view. The first two carry live chips: your own stacks and the three levels with yours marked.
- **Search progress.** One card, full from the first frame: what is being searched, Step n of 3, a timer and Cancel; a 2px bar driven by the real counts; a waiting row for every stack that has not answered yet; then the repo checks as they arrive. The active step says in one line what it is doing. Cancel returns to the landing with the stack and level kept, and says so.
- **Shareable searches.** The stack, level, Paid bounties and Active repos only are mirrored in the address (`/hunt?stack=nextjs,prisma&level=medium`), and only when they differ from the defaults, so a search can be bookmarked or sent to someone. On load the address is read back through a whitelist: stacks must match the picker's own list, anything else is dropped, and at most six stacks and 300 characters are read. A link fills in the choices and does not run the search, so opening a link never spends API quota. No name, id or token is ever put in the address. An address is not a security boundary, since anyone can type any address; misuse is stopped on the server (sign-in and per-account limits).
- **Stack picker.** Search with aliases (js, py, k8s), category chips, Popular and Recently used, up to six picks, arrow keys across tiles, a visible close button.
- **Filters.** Stack chips, Easy, Medium and Hard with the GitHub label each one means, Paid bounties, Active repos only.
- **Results toolbar.** Count, stack, difficulty and sort in one scrolling line. Sort has three groups (Freshness, Discussion, Claiming) and only reorders what is loaded.
- **Issue row.** Repo, health, Assigned badge, comments and age, then Proposal, copy and bookmark. A stack tag appears when several stacks are picked.
- **Details drawer.** Issue facts, claim check, quick start commands, repo health, contributors, then Draft proposal, Open in GitLense and Open on GitHub. Every name and number that has more behind it is a button. Open in GitLense opens a new tab, so this page, its results and the open drawer stay exactly as they are and nothing is fetched twice. Commands are shown in full, never cut with an ellipsis.
- **Learn guides.** Ten short written guides open as one more view of the drawer: reading an issue, who opened it, assigned or open, labels, claiming an issue, a first contribution from fork to pull request, reading the numbers, the license, whether a project is alive, and contributor docs. Each starts with what is true of this issue right now, then the words, the steps (commands copy in one click), what to watch out for, and links to GitHub's own docs and the next guide. They are static text filled in with the issue's own facts: no AI and no API call. The entry points sit where a newcomer would hesitate: a Learn button on This issue, Start contributing, Repository and Repository health, an info button on Opened by, Assignee, License and Community profile, a What labels mean chip beside the labels, a row in the claim check, and What these mean in the proposal box.
- **Proposal.** A short, honest comment. It never claims experience, shows claim signals (assigned, linked pull request, someone already asked), and Copy and open issue does both in one click. A plain template is in the box the moment it opens, and an AI draft replaces it only if you have not edited the text. If the AI is slow (15 seconds by default, `PROPOSAL_AI_TIMEOUT_MS` to change it), unavailable or unsafe to paste, the template stays and one line says which, with Regenerate to try again. A usage credit is spent only when an AI draft is actually used.
- **Marks.** The original ones, unchanged. Hunt: a dashed hexagon with four corner brackets, a small diamond, four ticks, a centre dot and a dotted ring, all in lime. GitLense: a plain hexagon with a lime centre dot. They appear in the sidebar, the stack picker, the hero and on GitLense. The drawer's Open in GitLense button and the Hunt link on GitLense use plain Lucide icons, so no new mark is introduced.
- **States.** Streaming progress, no-results with the next step, failed search with Try again, incomplete-results notice with Search again.

## GitLense

GitLense answers one question: what is inside this repository, and where do I start. It explains more than Hunt does, with the same restraint.

- **Colour.** One accent. Lime marks the primary action and whatever is found or done; everything else is grey. Amber means something is missing or needs care, rose means an error, and nothing else uses them. The old sky and violet tones are the same grey now (the names stay in the code so no call site changed), tiles and badges are flat, and the only gradient left is the lime headline text.
- **Shapes.** Squares with 6, 8 and 12px corners. No circles, rings or round avatars, and the loader is three square bars. The blurred glows behind the hero are the only round things left and nobody reads them as shapes.
- **Layout.** One column up to 1180px with a sticky section bar under the navbar (Overview, Readiness, Roadmap, Areas, Start files, Stack) that follows the scroll. The chat sits beside it from `xl`. Below that it is the last section, and a floating Ask button takes you there, held 100px above the bottom edge so it never sits under the dock.
- **Real logos.** A technology shows its own mark in its own colour, from the list the Hunt picker uses (`technology-options.ts`) plus a short table for tools that list lacks (npm, pnpm, ESLint, GitHub Actions, TypeORM, Mongoose, Render, iOS). A brand colour too dark for the page is lifted to light grey, as in Hunt. Where no official mark exists (AWS, Azure, Playwright, Turbopack, OpenAI and a few more) a neutral package glyph is shown. A letter badge is never shown.
- **Live progress.** The analysis streams what it finds, one line each: the file tree, languages, build, docs, CI and tests counted from the paths, the files ranked and the first ones opened, every file as it is read, the technologies detected, the code index, what the model is given, then the two writing steps. Each line is a real event from the server, so a bigger repository writes more lines. Nothing is a timer pretending to work.
- **Readiness.** Replaces "Repo at a glance". What is inside counts files, folders and tests and shows languages, the biggest folders, packages and tooling. Ready for newcomers runs six checks on the file tree (contributing guide, pull request template, issue templates, automated checks, tests, code of conduct), shows `found/6`, and each row says what the file is for and links to it. A missing file is information, never a failure. No AI is involved.
- **Roadmap.** Nine steps from fork to merged pull request. Nothing can be ticked, because the page cannot know what someone has done. Each step has buttons that open the real GitHub page in a new tab (fork, good first issues, help wanted, compare, pull requests, merged pull requests, commits, code search, workflows, and the repository's own contributing guide, README, environment example and pull request template when they exist) and a "Found in this repository" list of what the file tree shows for that step.
- **One run per level.** A finished analysis is kept in memory and in the tab (six at most, keyed by repository and level). Analyze at the same level shows it again and sends no request, and the button reads Analyzed until the repository or level changes. Changing the level offers "Analyze as {level}", or "Show the {level} version" when that level is already done. Tokens are spent only on a new repository or a new level.
- **Shareable links.** The address follows the form (`/gitlense?repo=vercel/next.js&level=Veteran`, only when it differs from the defaults). Opening a link fills the form and never starts a run, and Hunt's hand-over (`?url=`) is read the same way. Copy link sits in the result header.
- **Ask about this repo.** The chat is given the analysis, not the repository, so it cannot know live facts. Questions about open issues or pull requests are answered from GitHub's own API in the browser (good first issue, then help wanted, then most recently updated), with no model and no tokens, and the answer says so. While the model works, the wait lists what was sent and the closest parts of the analysis to the question instead of counting seconds. An answer that says it cannot know gets quick links to the repository's issues, pull requests and code search. GitHub's anonymous limit is explained in words, with the same list one click away.

## Hunt and GitLense together

Both are parts of OSHunt, so they share the foundations: the same surfaces, Outfit, one lime primary per view, status colours only for status, 6, 8 and 12px corners, real brand logos, shadcn primitives, 40px targets, the same close button in the same corner, AA contrast, links that only fill a form, progress that is real, and plain honest copy. They differ where their jobs differ.

| | Hunt | GitLense |
|---|---|---|
| Job | Choose an issue | Understand the repo behind it |
| Feel | Instrument: radar, reticle, dot grid | Guide: lens, live feed, checks |
| Colour | Neutral, status only | Neutral, one lime accent, status only |
| Layout | Rail plus dense list | One column plus chat |
| Signature | Viewfinder corners, scope | Square tiles, progress feed, readiness bar |

Recommendation: keep two heroes on one set of tokens, because the pages are used differently and different art makes it clear which tool you are in. Keep the hand-over explicit: each page opens the other in a new tab, so nobody loses the results or the repository they were reading, and the second page makes no API call until they ask. Hunt opens GitLense with the issue link filled in, and GitLense starts only when Analyze is pressed. When the project's `globals.css` and Navbar are shared, move the colour and radius tokens above into it so a change lands in both.

## Do's and Don'ts

- Do say exactly what a control does before it does it, and name the GitHub label a difficulty means.
- Do keep one lime primary per view, a visible focus ring and a pointer cursor on every clickable element.
- Do show what failed and offer the retry on the screen where it failed.
- Do explain a term where it appears: a Learn or info button opens a short guide in the same drawer, so nobody has to leave to look it up.
- Do open a link that would replace what someone is reading in a new tab, and say so with the arrow icon and "opens in a new tab" for screen readers.
- Do keep Back and Escape stepping out of a drawer view before they close the drawer.
- Do keep the last content clear of the dock, and keep only the stack, level and two switches in the address.
- Don't use green glow, emoji icons, or em dashes in visible text or aria-labels.
- Don't ask AI for what a rule can do. The proposal never invents experience, and quota is spent only when something usable exists.
- Don't put names, ids or tokens in a URL, and don't treat a hard-to-guess URL as protection. Authorise on the server.
- Don't render a random value on the server. Anything dealt at random is dealt in the browser after hydration.
- Don't carry meaning in colour alone, and don't let a fixed header sit above a drawer.
- Don't show progress or completion the page cannot know: no tick boxes, no percent done, no timers standing in for work.
- Don't run a paid action again for a result that is already on screen. Repeat only when the repository or the level changed.
- Don't draw a logo. Show the real mark or a neutral glyph.

### Accessibility

WCAG AA contrast, measured by computed colour. Menus, dialogs and drawers are keyboard operable with trapped focus, Escape closes, and focus returns to the control that opened them. Results, progress and errors are announced. axe reports no violations on the landing (before and after everything has scrolled into view), the link notice, the progress card, the page after Cancel, results, sort menu, proposal, every drawer view including all ten Learn guides, picker, error state, Filters sheet and GitLense hand-over, at 375 and 1440 widths, with the dock in the page. Shuffle and Cancel are real buttons, and the new set, the link notice and the cancel notice are announced. The dock's tabs are links with `aria-current="page"` on the active one. From 320 to 1440 no text is cut off and nothing scrolls sideways. GitLense meets the same bar: axe reports no violations on the idle page, the live progress card, the result, the area and file sheets, a chat answer, the new-level banner and the error state at 375 and 1280, computed contrast is AA everywhere, the roadmap buttons are real links with a focus ring, and nothing scrolls sideways from 320 to 1920.
