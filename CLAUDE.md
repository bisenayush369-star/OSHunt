# OSHunt — Claude Code Context

## Project
Full-stack Next.js 16 app. AI-powered open source contribution finder.
Routes: / (landing) /hunt /analyze /profile /bookmarks /pricing /auth/signin

## Stack
Next.js App Router · TypeScript · Tailwind · Prisma · PostgreSQL (Neon) · NextAuth v5 · Gemini API · GitHub API · Razorpay

## Key files
- app/page.tsx — landing page with 3D splash, ticker, hero
- app/hunt/page.tsx — issue finder with react-select language dropdown
- app/analyze/page.tsx — GitLense repo analyzer
- app/profile/page.tsx — server component, fetches Prisma data
- app/bookmarks/page.tsx — saved issues and repos
- lib/auth.ts — NextAuth with GitHub + Google providers
- lib/prisma.ts — singleton Prisma client
- prisma/schema.prisma — User, Account, Session, Contribution, Streak, SavedStack, Bookmark

## Env vars needed
DATABASE_URL · AUTH_SECRET · GITHUB_ID · GITHUB_SECRET · GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET · GITHUB_TOKEN · GEMINI_API_KEY · RAZORPAY_KEY_ID · RAZORPAY_KEY_SECRET

## Rules for Claude Code
- Never rewrite working files — only patch what's broken
- Always use TypeScript strict types
- Keep #090909 background, #a8ff3e accent, Outfit font — never change brand colors
- Prisma queries go in server components or API routes only, never client components
- All new pages need the Navbar component from components/Navbar.tsx