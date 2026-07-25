import type { ReadFile, RepoMetadata, RepositoryType, TechDetection } from "./types"

function findFile(files: ReadFile[], path: string): ReadFile | undefined {
  return files.find((f) => f.path === path)
}

function safeJsonParse(content: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(content)
    return typeof parsed === "object" && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Repository type (single-package vs monorepo)
// ─────────────────────────────────────────────────────────────────────────

function detectRepositoryType(treePaths: string[]): { type: RepositoryType; monorepoTool: string | null } {
  const has = (p: string) => treePaths.includes(p)
  const hasWorkspaceDirs = treePaths.some((p) => /^(apps|packages)\//.test(p))

  if (has("turbo.json")) return { type: "monorepo", monorepoTool: "Turborepo" }
  if (has("nx.json")) return { type: "monorepo", monorepoTool: "Nx" }
  if (has("lerna.json")) return { type: "monorepo", monorepoTool: "Lerna" }
  if (has("pnpm-workspace.yaml")) return { type: "monorepo", monorepoTool: "pnpm workspaces" }
  if (hasWorkspaceDirs) return { type: "monorepo", monorepoTool: null }
  return { type: "single-package", monorepoTool: null }
}

// ─────────────────────────────────────────────────────────────────────────
// JS/TS ecosystem — the richest detection path, since it's derived from
// actually-parsed package.json dependencies plus real config-file presence
// (a config file in the tree is stronger evidence than a dependency alone,
// since a dependency can be transitive or unused).
// ─────────────────────────────────────────────────────────────────────────

interface JsDetection {
  framework: string | null
  runtime: string | null
  packageManager: string | null
  buildTool: string | null
  testing: string[]
  linting: string[]
  styling: string[]
  database: string[]
  orm: string[]
  deployment: string[]
}

function detectJsEcosystem(treePaths: string[], pkg: Record<string, any> | null): JsDetection {
  const deps: Record<string, string> = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) }
  const dep = (name: string) => name in deps
  const file = (re: RegExp) => treePaths.some((p) => re.test(p))

  let framework: string | null = null
  if (file(/^next\.config\.(js|mjs|ts)$/) || dep("next")) framework = "Next.js"
  else if (file(/^nuxt\.config\.(js|ts)$/) || dep("nuxt")) framework = "Nuxt"
  else if (dep("@nestjs/core")) framework = "NestJS"
  else if (dep("@angular/core")) framework = "Angular"
  else if (file(/^svelte\.config\.(js|ts)$/) || dep("svelte")) framework = dep("@sveltejs/kit") ? "SvelteKit" : "Svelte"
  else if (dep("astro")) framework = "Astro"
  else if (dep("remix") || dep("@remix-run/react")) framework = "Remix"
  else if (dep("fastify")) framework = "Fastify"
  else if (dep("express")) framework = "Express"
  else if (dep("vue")) framework = "Vue"
  else if (dep("react") || dep("react-dom")) framework = "React"

  let runtime: string | null = null
  if (file(/^deno\.jsonc?$/)) runtime = "Deno"
  else if (file(/^bunfig\.toml$/) || treePaths.includes("bun.lockb")) runtime = "Bun"
  else if (pkg) runtime = "Node.js"

  let packageManager: string | null = null
  if (treePaths.includes("pnpm-lock.yaml")) packageManager = "pnpm"
  else if (treePaths.includes("yarn.lock")) packageManager = "yarn"
  else if (treePaths.includes("bun.lockb")) packageManager = "bun"
  else if (treePaths.includes("package-lock.json")) packageManager = "npm"

  let buildTool: string | null = null
  if (file(/^vite\.config\.(ts|js|mjs)$/) || dep("vite")) buildTool = "Vite"
  else if (dep("turbopack") || (framework === "Next.js" && dep("next") && Number.parseInt((deps.next || "").replace(/[^\d]/g, "")) >= 13)) buildTool = "webpack/Turbopack (via Next.js)"
  else if (dep("webpack")) buildTool = "Webpack"
  else if (dep("rollup")) buildTool = "Rollup"
  else if (dep("esbuild")) buildTool = "esbuild"
  else if (dep("parcel")) buildTool = "Parcel"

  const testing = [
    dep("jest") && "Jest",
    dep("vitest") && "Vitest",
    dep("@playwright/test") && "Playwright",
    dep("cypress") && "Cypress",
    dep("@testing-library/react") && "Testing Library",
    dep("mocha") && "Mocha",
  ].filter(Boolean) as string[]

  const linting = [
    (dep("eslint") || file(/^\.eslintrc/) || file(/^eslint\.config\./)) && "ESLint",
    dep("prettier") && "Prettier",
    (dep("@biomejs/biome") || treePaths.includes("biome.json")) && "Biome",
  ].filter(Boolean) as string[]

  const styling = [
    (dep("tailwindcss") || file(/^tailwind\.config\./)) && "Tailwind CSS",
    dep("styled-components") && "styled-components",
    dep("@emotion/react") && "Emotion",
    dep("sass") && "Sass",
  ].filter(Boolean) as string[]

  const database = [
    dep("pg") && "PostgreSQL",
    dep("mysql2") && "MySQL",
    dep("mongodb") && "MongoDB",
    dep("ioredis") || dep("redis") ? "Redis" : null,
    dep("better-sqlite3") || dep("sqlite3") ? "SQLite" : null,
    dep("@supabase/supabase-js") && "Supabase",
  ].filter(Boolean) as string[]

  const orm = [
    dep("prisma") || dep("@prisma/client") ? "Prisma" : null,
    dep("drizzle-orm") && "Drizzle",
    dep("typeorm") && "TypeORM",
    dep("sequelize") && "Sequelize",
    dep("mongoose") && "Mongoose",
  ].filter(Boolean) as string[]

  const deployment = [
    file(/^vercel\.json$/) && "Vercel",
    file(/^netlify\.toml$/) && "Netlify",
    file(/^railway\.(json|toml)$/) && "Railway",
    file(/^fly\.toml$/) && "Fly.io",
    file(/^Dockerfile$/) && "Docker",
    file(/^\.github\/workflows\//) && "GitHub Actions",
  ].filter(Boolean) as string[]

  return { framework, runtime, packageManager, buildTool, testing, linting, styling, database, orm, deployment }
}

// ─────────────────────────────────────────────────────────────────────────
// Non-JS ecosystems — presence of the manifest is the primary signal, plus a
// lightweight text search *inside* the manifest for a short, known list of
// framework names. This is intentionally not a full TOML/XML/Gradle parser —
// see the note in the route handler for why that trade-off is reasonable here.
// ─────────────────────────────────────────────────────────────────────────

function detectNonJsEcosystem(treePaths: string[], files: ReadFile[]): { language: string | null; framework: string | null; packageManager: string | null } {
  const has = (p: string) => treePaths.includes(p)
  const content = (p: string) => findFile(files, p)?.content?.toLowerCase() ?? ""

  if (has("Cargo.toml")) {
    const c = content("Cargo.toml")
    const framework = c.includes("actix-web") ? "Actix Web" : c.includes("axum") ? "Axum" : c.includes("bevy") ? "Bevy" : c.includes("rocket") ? "Rocket" : null
    return { language: "Rust", framework, packageManager: "Cargo" }
  }
  if (has("go.mod")) {
    const c = content("go.mod")
    const framework = c.includes("gin-gonic/gin") ? "Gin" : c.includes("labstack/echo") ? "Echo" : c.includes("gofiber/fiber") ? "Fiber" : null
    return { language: "Go", framework, packageManager: "Go modules" }
  }
  if (has("pyproject.toml") || has("requirements.txt")) {
    const c = content("pyproject.toml") + content("requirements.txt")
    const framework = c.includes("django") ? "Django" : c.includes("fastapi") ? "FastAPI" : c.includes("flask") ? "Flask" : null
    const packageManager = has("pyproject.toml") && content("pyproject.toml").includes("[tool.poetry]") ? "Poetry" : "pip"
    return { language: "Python", framework, packageManager }
  }
  if (has("pom.xml") || has("build.gradle") || has("build.gradle.kts")) {
    const c = content("pom.xml") + content("build.gradle") + content("build.gradle.kts")
    const framework = c.includes("spring-boot") || c.includes("springframework.boot") ? "Spring Boot" : null
    return { language: "Java", framework, packageManager: has("pom.xml") ? "Maven" : "Gradle" }
  }
  if (has("composer.json")) {
    const c = content("composer.json")
    const framework = c.includes("laravel/framework") ? "Laravel" : c.includes("symfony/") ? "Symfony" : null
    return { language: "PHP", framework, packageManager: "Composer" }
  }

  return { language: null, framework: null, packageManager: null }
}

export function detectTechStack(
  treePaths: string[],
  files: ReadFile[],
  metadata: RepoMetadata
): TechDetection {
  const { type: repositoryType, monorepoTool } = detectRepositoryType(treePaths)

  const rootPkgFile = findFile(files, "package.json")
  const pkg = rootPkgFile ? safeJsonParse(rootPkgFile.content) : null

  const js = detectJsEcosystem(treePaths, pkg)
  const nonJs = pkg ? { language: null, framework: null, packageManager: null } : detectNonJsEcosystem(treePaths, files)

  return {
    repositoryType,
    monorepoTool,
    framework: js.framework ?? nonJs.framework,
    runtime: js.runtime ?? (nonJs.language ? nonJs.language : null),
    language: nonJs.language ?? metadata.primaryLanguage,
    packageManager: js.packageManager ?? nonJs.packageManager,
    buildTool: js.buildTool,
    testing: js.testing,
    linting: js.linting,
    styling: js.styling,
    database: js.database,
    orm: js.orm,
    deployment: js.deployment,
  }
}
