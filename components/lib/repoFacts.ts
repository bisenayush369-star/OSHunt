// Deterministic facts about a repository, derived from its file tree alone. No model is involved.
//
// They are used three ways: sent to the page (progress log, readiness strip), summarised into the
// prompts so the model works from real numbers, and turned into a safe default roadmap when the
// model's own roadmap can't be used. Everything here is a pure function of the tree.
//
// Suggested location: components/lib/repoFacts.ts

export interface TreeEntry {
  path: string
  type?: string
  size?: number
}

export const ROADMAP_IDS = ["fork", "setup", "run", "issue", "explore", "change", "verify", "pr", "review"] as const
export type RoadmapId = (typeof ROADMAP_IDS)[number]

export interface RoadmapStep {
  id: RoadmapId
  summary: string
  actions: string[]
  commands: string[]
  files: string[]
  watchOut: string
  done: string
  /** True when the step comes from the built-in default instead of the model. */
  generic: boolean
}

export interface RepoFacts {
  files: number
  folders: number
  size: "tiny" | "small" | "medium" | "large" | "huge"
  /** Paths ignored as generated or vendored (node_modules, dist, ...). */
  skipped: number
  languages: { name: string; files: number; pct: number }[]
  topFolders: { name: string; files: number }[]
  /** Workspace members of a monorepo, largest first. */
  packages: { path: string; files: number }[]
  manager: string | null
  docs: {
    readme: string | null
    contributing: string | null
    conduct: string | null
    security: string | null
    license: string | null
    changelog: string | null
    architecture: string | null
    development: string | null
    prTemplate: string | null
    issueTemplates: number
  }
  ci: { provider: string | null; workflows: number }
  tests: { files: number; folders: string[]; tools: string[] }
  tooling: string[]
  envExample: string | null
  entry: string[]
}

export interface TreeIndex {
  files: string[]
  fileSet: Set<string>
  /** Directory path to the number of files below it, at any depth. */
  dirCount: Map<string, number>
  skipped: number
}

// ── Indexing ─────────────────────────────────────────────────────────────────

const GENERATED = /(^|\/)(node_modules|vendor|dist|target|coverage|__pycache__|venv|\.venv|\.next|\.nuxt|\.turbo|\.cache|\.gradle|Pods)\//
const DIR_TYPES = new Set(["tree", "dir", "directory"])

export function indexTree(tree: TreeEntry[]): TreeIndex {
  const files: string[] = []
  const fileSet = new Set<string>()
  const dirCount = new Map<string, number>()
  let skipped = 0
  for (const entry of tree) {
    const path = typeof entry?.path === "string" ? entry.path : ""
    if (!path || (entry.type && DIR_TYPES.has(entry.type)) || fileSet.has(path)) continue
    if (GENERATED.test(path)) {
      skipped++
      continue
    }
    files.push(path)
    fileSet.add(path)
    for (let i = path.indexOf("/"); i !== -1; i = path.indexOf("/", i + 1)) {
      const dir = path.slice(0, i)
      dirCount.set(dir, (dirCount.get(dir) ?? 0) + 1)
    }
  }
  return { files, fileSet, dirCount, skipped }
}

// ── Detection tables ─────────────────────────────────────────────────────────

const LANG_BY_EXT: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", mts: "TypeScript", cts: "TypeScript",
  js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", rs: "Rust", go: "Go", java: "Java", kt: "Kotlin", kts: "Kotlin", swift: "Swift",
  rb: "Ruby", php: "PHP", c: "C", h: "C", cc: "C++", cpp: "C++", hpp: "C++", cs: "C#",
  scala: "Scala", dart: "Dart", ex: "Elixir", exs: "Elixir", hs: "Haskell", lua: "Lua", zig: "Zig",
  sh: "Shell", bash: "Shell", zsh: "Shell", vue: "Vue", svelte: "Svelte", astro: "Astro",
  html: "HTML", css: "CSS", scss: "SCSS", sass: "SCSS", less: "CSS", clj: "Clojure", ml: "OCaml",
  jl: "Julia", r: "R", m: "Objective-C", mm: "Objective-C", sql: "SQL", tf: "Terraform", nix: "Nix",
}

/** Build tools and package managers, strongest signal first. Names are compared in lower case. */
const MANAGERS: [string, string[]][] = [
  ["pnpm", ["pnpm-lock.yaml", "pnpm-workspace.yaml"]],
  ["yarn", ["yarn.lock"]],
  ["bun", ["bun.lockb", "bun.lock"]],
  ["npm", ["package-lock.json", "npm-shrinkwrap.json"]],
  ["cargo", ["cargo.toml"]],
  ["go", ["go.mod"]],
  ["uv", ["uv.lock"]],
  ["poetry", ["poetry.lock"]],
  ["pipenv", ["pipfile"]],
  ["pip", ["requirements.txt", "pyproject.toml", "setup.py", "setup.cfg"]],
  ["maven", ["pom.xml"]],
  ["gradle", ["build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"]],
  ["bundler", ["gemfile"]],
  ["composer", ["composer.json"]],
  ["mix", ["mix.exs"]],
  ["pub", ["pubspec.yaml"]],
  ["swiftpm", ["package.swift"]],
  ["cmake", ["cmakelists.txt"]],
  ["npm", ["package.json"]],
  ["make", ["makefile"]],
]

const MANIFESTS = new Set(["package.json", "cargo.toml", "go.mod", "pyproject.toml", "pom.xml", "build.gradle", "build.gradle.kts", "mix.exs", "pubspec.yaml"])
const NOT_A_PACKAGE = /(^|\/)(test|tests|__tests__|fixtures?|__fixtures__|e2e|examples?|docs?|templates?|bench(marks?)?|playground|sandbox|scripts)(\/|$)/i

const TEST_FILE = /(\.(test|spec)\.[a-z0-9]+$|_test\.(go|py|rb|exs?)$|(^|\/)test_[^/]+\.py$|Tests?\.(java|kt|cs|swift)$|_spec\.rb$)/
const TEST_DIR = /(^|\/)(__tests__|tests?|spec|e2e|cypress)\//i

const TEST_TOOLS: [string, RegExp][] = [
  ["Jest", /^jest\.config\.\w+$/],
  ["Vitest", /^vitest\.(config|workspace)\.\w+$/],
  ["Playwright", /^playwright\.config\.\w+$/],
  ["Cypress", /^cypress\.config\.\w+$/],
  ["Mocha", /^\.mocharc(\.\w+)?$/],
  ["pytest", /^(pytest\.ini|conftest\.py|tox\.ini)$/],
  ["RSpec", /^(\.rspec|spec_helper\.rb)$/],
  ["PHPUnit", /^phpunit\.xml(\.dist)?$/],
]

const TOOLING: [string, RegExp][] = [
  ["TypeScript", /^tsconfig(\.[\w-]+)?\.json$/],
  ["ESLint", /^(\.eslintrc(\.\w+)?|eslint\.config\.\w+)$/],
  ["Prettier", /^(\.prettierrc(\.\w+)?|prettier\.config\.\w+)$/],
  ["Biome", /^biome\.jsonc?$/],
  ["Ruff", /^\.?ruff\.toml$/],
  ["golangci-lint", /^\.golangci\.ya?ml$/],
  ["rustfmt", /^\.?rustfmt\.toml$/],
  ["EditorConfig", /^\.editorconfig$/],
  ["pre-commit", /^\.pre-commit-config\.ya?ml$/],
  ["Docker", /^(dockerfile|docker-compose(\.[\w-]+)?\.ya?ml|compose\.ya?ml)$/i],
  ["Turborepo", /^turbo\.jsonc?$/],
  ["Nx", /^nx\.json$/],
  ["Lerna", /^lerna\.json$/],
]
const TOOLING_DIRS: [string, string][] = [
  [".husky", "Husky"],
  [".changeset", "Changesets"],
  [".devcontainer", "Dev container"],
]

const ENTRY: RegExp[] = [
  /^(src\/)?(index|main|app|server|cli)\.(ts|tsx|js|jsx|mjs|py|go|rs|java|kt|rb|php)$/,
  /^cmd\/[^/]+\/main\.go$/,
  /^(src\/)?(app|pages)\/(page|index|layout)\.(tsx|jsx|ts|js)$/,
  /^(manage|main)\.(py|go|rs|c|cpp)$/,
  /^(src\/)?(lib\.rs|__main__\.py)$/,
  /^src\/main\/java\/.+\/(Main|Application)\.java$/,
]

const CI_SINGLES: [string, RegExp][] = [
  ["GitLab CI", /^\.gitlab-ci\.ya?ml$/],
  ["CircleCI", /^\.circleci\/config\.ya?ml$/],
  ["Azure Pipelines", /^azure-pipelines\.ya?ml$/],
  ["Travis CI", /^\.travis\.ya?ml$/],
  ["Jenkins", /^Jenkinsfile$/],
]

const sizeClass = (n: number): RepoFacts["size"] => (n < 60 ? "tiny" : n < 400 ? "small" : n < 3000 ? "medium" : n < 15000 ? "large" : "huge")

// ── Facts ────────────────────────────────────────────────────────────────────

export function computeRepoFacts(index: TreeIndex): RepoFacts {
  const { files, dirCount } = index
  const langCount = new Map<string, number>()
  const rootNames = new Set<string>()
  const allNames = new Set<string>()
  const docs: RepoFacts["docs"] = {
    readme: null, contributing: null, conduct: null, security: null, license: null,
    changelog: null, architecture: null, development: null, prTemplate: null, issueTemplates: 0,
  }
  const docRank = new Map<string, number>() // lower rank wins: root, then .github, then docs
  const note = (key: Exclude<keyof RepoFacts["docs"], "issueTemplates">, path: string, rank: number) => {
    if ((docRank.get(key) ?? 99) <= rank) return
    docRank.set(key, rank)
    docs[key] = path
  }
  const tooling = new Set<string>()
  const testTools = new Set<string>()
  const testFolders = new Map<string, number>()
  const manifestDirs = new Set<string>()
  const workflows: string[] = []
  let ciOther: string | null = null
  let testFiles = 0
  let envExample: string | null = null
  const entry: string[] = []

  for (const path of files) {
    const slash = path.lastIndexOf("/")
    const name = path.slice(slash + 1)
    const lower = name.toLowerCase()
    const dir = slash === -1 ? "" : path.slice(0, slash)
    const dirLower = dir.toLowerCase()
    const first = path.slice(0, path.indexOf("/") === -1 ? 0 : path.indexOf("/"))
    const rank = dirLower === "" ? 0 : dirLower === ".github" ? 1 : dirLower === "docs" ? 2 : 9

    allNames.add(lower)
    if (dir === "") rootNames.add(lower)

    // Languages: source files only, by extension.
    const dot = lower.lastIndexOf(".")
    const lang = dot > 0 ? LANG_BY_EXT[lower.slice(dot + 1)] : undefined
    if (lang) langCount.set(lang, (langCount.get(lang) ?? 0) + 1)

    // Documentation and community files.
    if (rank < 9) {
      if (rank === 0 && /^readme(\.\w+)?$/.test(lower)) note("readme", path, 0)
      if (/^contribut(ing|e)(-guide)?(\.\w+)?$/.test(lower)) note("contributing", path, rank)
      if (/^code[-_]of[-_]conduct(\.\w+)?$/.test(lower)) note("conduct", path, rank)
      if (rank < 2 && /^security(\.\w+)?$/.test(lower)) note("security", path, rank)
      if (rank === 0 && /^(license|licence|copying)(\.\w+)?$/.test(lower)) note("license", path, 0)
      if (rank === 0 && /^(changelog|changes|history|news)(\.\w+)?$/.test(lower)) note("changelog", path, 0)
      if (rank !== 1 && /^(architecture|design|internals)(\.\w+)?$/.test(lower)) note("architecture", path, rank)
      if (/^(development|developing|hacking|dev-setup)(\.\w+)?$/.test(lower)) note("development", path, rank)
      if (/^pull_request_template(\.\w+)?$/.test(lower)) note("prTemplate", path, rank)
    }
    if (dirLower === ".github/pull_request_template") note("prTemplate", path, 1)
    if (dirLower === ".github/issue_template" && !/^config\.ya?ml$/.test(lower)) docs.issueTemplates++
    else if (dirLower === ".github" && /^issue_template(\.\w+)?$/.test(lower)) docs.issueTemplates++

    // Continuous integration.
    if (dirLower === ".github/workflows" && /\.ya?ml$/.test(lower)) workflows.push(path)
    else if (!ciOther) for (const [provider, re] of CI_SINGLES) if (re.test(path)) ciOther = provider

    // Tests.
    if (TEST_FILE.test(name) || TEST_DIR.test(path)) {
      testFiles++
      const key = first || "(root)"
      testFolders.set(key, (testFolders.get(key) ?? 0) + 1)
    }
    for (const [tool, re] of TEST_TOOLS) if (re.test(lower)) testTools.add(tool)

    // Tooling and local setup.
    for (const [tool, re] of TOOLING) if (re.test(name)) tooling.add(tool)
    for (const [prefix, tool] of TOOLING_DIRS) if (path.startsWith(`${prefix}/`)) tooling.add(tool)
    if (!envExample && /^\.env\.(example|sample|template)$/.test(lower)) envExample = path

    // Workspace members and entry points.
    if (dir !== "" && MANIFESTS.has(lower) && !NOT_A_PACKAGE.test(dir)) manifestDirs.add(dir)
    if (entry.length < 200 && ENTRY.some((re) => re.test(path))) entry.push(path)
  }

  // Package manager: the root decides when it can, otherwise any manifest in the tree.
  const detect = (names: Set<string>) =>
    MANAGERS.find(([, markers]) => markers.some((m) => names.has(m)))?.[0] ?? ([...names].some((n) => /\.(csproj|sln)$/.test(n)) ? "dotnet" : null)
  const manager = detect(rootNames) ?? detect(allNames)

  // Workspace packages: each file counts towards its deepest package directory.
  const packageCount = new Map<string, number>()
  if (manifestDirs.size >= 2) {
    for (const path of files) {
      for (let i = path.lastIndexOf("/"); i > 0; i = path.lastIndexOf("/", i - 1)) {
        const dir = path.slice(0, i)
        if (manifestDirs.has(dir)) {
          packageCount.set(dir, (packageCount.get(dir) ?? 0) + 1)
          break
        }
      }
    }
  }

  const totalLang = [...langCount.values()].reduce((a, b) => a + b, 0)
  const languages = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, n]) => ({ name, files: n, pct: Math.max(1, Math.round((n / totalLang) * 100)) }))

  const topFolders = [...dirCount.entries()]
    .filter(([dir]) => !dir.includes("/") && !dir.startsWith("."))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name, n]) => ({ name, files: n }))

  return {
    files: files.length,
    folders: dirCount.size,
    size: sizeClass(files.length),
    skipped: index.skipped,
    languages,
    topFolders,
    packages: [...packageCount.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([path, n]) => ({ path, files: n })),
    manager,
    docs,
    ci: { provider: workflows.length ? "GitHub Actions" : ciOther, workflows: workflows.length },
    tests: {
      files: testFiles,
      folders: [...testFolders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name),
      tools: [...testTools],
    },
    tooling: [...tooling],
    envExample,
    entry: entry.sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b)).slice(0, 5),
  }
}

/** A few plain lines for the prompts, so the model can lean on real numbers instead of guessing. */
export function factsDigest(f: RepoFacts): string {
  const lines = [
    `Files indexed: ${f.files} in ${f.folders} folders (${f.size} repository)`,
    f.languages.length ? `Languages by file count: ${f.languages.map((l) => `${l.name} ${l.pct}%`).join(", ")}` : "",
    f.manager ? `Package manager or build tool: ${f.manager}` : "",
    f.topFolders.length ? `Top folders: ${f.topFolders.map((d) => `${d.name}/ (${d.files} files)`).join(", ")}` : "",
    f.packages.length ? `Workspace packages: ${f.packages.map((p) => `${p.path} (${p.files} files)`).join(", ")}` : "",
    `Docs found: ${
      [
        f.docs.contributing && `contributing guide (${f.docs.contributing})`,
        f.docs.development && `development guide (${f.docs.development})`,
        f.docs.architecture && `architecture notes (${f.docs.architecture})`,
        f.docs.conduct && "code of conduct",
        f.docs.prTemplate && `pull request template (${f.docs.prTemplate})`,
        f.docs.issueTemplates > 0 && `${f.docs.issueTemplates} issue templates`,
      ]
        .filter(Boolean)
        .join(", ") || "none of the usual contribution files"
    }`,
    f.ci.provider ? `CI: ${f.ci.provider}${f.ci.workflows ? ` (${f.ci.workflows} workflows)` : ""}` : "CI: none found",
    f.tests.files ? `Tests: ${f.tests.files} test files${f.tests.tools.length ? `, tools ${f.tests.tools.join(", ")}` : ""}` : "Tests: none found",
    f.tooling.length ? `Tooling: ${f.tooling.join(", ")}` : "",
    f.envExample ? `Env template: ${f.envExample}` : "",
    f.entry.length ? `Likely entry points: ${f.entry.join(", ")}` : "",
  ]
  return lines.filter(Boolean).join("\n")
}

// ── Default roadmap ──────────────────────────────────────────────────────────

export const FORK_BRANCH = "my-change"

const INSTALL: Record<string, string> = {
  pnpm: "pnpm install", yarn: "yarn install", bun: "bun install", npm: "npm install", cargo: "cargo build",
  go: "go mod download", uv: "uv sync", poetry: "poetry install", pipenv: "pipenv install --dev",
  pip: "pip install -r requirements.txt", maven: "mvn install -DskipTests", gradle: "./gradlew build",
  bundler: "bundle install", composer: "composer install", mix: "mix deps.get", pub: "dart pub get",
  swiftpm: "swift build", dotnet: "dotnet restore", cmake: "cmake -B build && cmake --build build", make: "make",
}
const RUN: Record<string, string> = { cargo: "cargo run", go: "go run ." }
const TEST: Record<string, string> = {
  pnpm: "pnpm test", yarn: "yarn test", bun: "bun test", npm: "npm test", cargo: "cargo test", go: "go test ./...",
  uv: "uv run pytest", poetry: "poetry run pytest", pipenv: "pipenv run pytest", pip: "pytest", maven: "mvn test",
  gradle: "./gradlew test", bundler: "bundle exec rake test", composer: "composer test", mix: "mix test",
  pub: "dart test", swiftpm: "swift test", dotnet: "dotnet test", cmake: "ctest --test-dir build", make: "make test",
}

export function forkCommands(owner: string, repo: string) {
  return [`git clone https://github.com/YOUR-USERNAME/${repo}.git`, `cd ${repo}`, `git remote add upstream https://github.com/${owner}/${repo}.git`]
}
export const branchCommand = () => `git switch -c ${FORK_BRANCH}`
export const pushCommand = () => `git push -u origin ${FORK_BRANCH}`

/**
 * A roadmap built only from the tree. It is correct but generic, and it is used for any step the model
 * didn't write, so a contributor always gets the whole path from fork to merge.
 */
export function buildFallbackRoadmap(owner: string, repo: string, f: RepoFacts): RoadmapStep[] {
  const m = f.manager
  const step = (id: RoadmapId, summary: string, actions: string[], extra: Partial<RoadmapStep> = {}): RoadmapStep => ({
    id, summary, actions, commands: [], files: [], watchOut: "", done: "", generic: true, ...extra,
  })
  const guide = f.docs.contributing ?? f.docs.development
  const srcFolders = f.topFolders.filter((d) => !/^(docs?|tests?|spec|examples?|scripts|\.github)$/i.test(d.name)).slice(0, 3)

  return [
    step("fork", "Make your own copy of the repository and link it to the original.", [
      `Fork ${owner}/${repo} with the Fork button on GitHub.`,
      "Clone your fork, then add the original repository as `upstream` so you can pull in new changes.",
    ], { commands: forkCommands(owner, repo), done: "You have the code locally and two remotes: origin and upstream." }),

    step("setup", m ? `Install dependencies with ${m}.` : "Install what the project needs to build.", [
      m && INSTALL[m] ? `Run the install command from the repository root.` : "Check the README for the install command.",
      f.envExample ? `Copy \`${f.envExample}\` to a local env file and fill in the values.` : "",
      guide ? `Read \`${guide}\` before you start. It lists the project's own setup rules.` : "",
    ].filter(Boolean), {
      commands: m && INSTALL[m] ? [INSTALL[m]] : [],
      files: [f.envExample, guide].filter((p): p is string => Boolean(p)),
      done: "The install finishes without errors.",
    }),

    step("run", "Run the project once before you change anything.", [
      m === "npm" || m === "pnpm" || m === "yarn" || m === "bun" ? "Open `package.json` and look in `scripts` for a dev or start command." : "Start it the way the README describes.",
      "Confirm it works untouched, so you can tell your changes from existing problems.",
    ], { commands: m && RUN[m] ? [RUN[m]] : [], files: f.entry.slice(0, 2), done: "You can see the project running or its build passing." }),

    step("issue", "Choose a small, well-described issue to start with.", [
      "Filter open issues by `good first issue` or `help wanted`.",
      "Comment that you are taking it and wait for a maintainer to confirm.",
      f.docs.contributing ? "Check the contributing guide for how issues are assigned." : "",
    ].filter(Boolean), { files: f.docs.contributing ? [f.docs.contributing] : [], done: "An issue is assigned to you or confirmed by a maintainer." }),

    step("explore", "Find the code the issue touches.", [
      srcFolders.length ? `Most of the code lives in ${srcFolders.map((d) => `\`${d.name}/\``).join(", ")}.` : "Search the repository for the names used in the issue.",
      f.entry.length ? "Start from an entry point and follow the call to the feature." : "Search for the error text or feature name from the issue.",
    ], { files: f.entry.slice(0, 3), done: "You know which files to change." }),

    step("change", "Make the smallest change that solves the issue.", [
      "Create a branch for your work.",
      f.tooling.length ? `Follow the project's style tooling: ${f.tooling.slice(0, 4).join(", ")}.` : "Match the style of the surrounding code.",
      "Keep the change focused on one issue.",
    ], { commands: [branchCommand()], done: "The change works for the case in the issue." }),

    step("verify", "Run the checks before you push.", [
      f.tests.files ? `The repository has ${f.tests.files} test files${f.tests.folders.length ? `, mostly under ${f.tests.folders.map((d) => `\`${d}/\``).join(", ")}` : ""}.` : "No tests were found in the tree, so check the change by hand.",
      "Add or update a test when the change alters behavior.",
    ], { commands: m && TEST[m] && f.tests.files ? [TEST[m]] : [], done: "Tests and linters pass locally." }),

    step("pr", "Push your branch and open a pull request.", [
      "Push the branch to your fork, then open a pull request against the original repository.",
      f.docs.prTemplate ? "Fill in the pull request template fully." : "Describe what changed and why, and link the issue.",
    ], { commands: [pushCommand()], files: f.docs.prTemplate ? [f.docs.prTemplate] : [], done: "The pull request is open and linked to the issue." }),

    step("review", "Respond to review and get it merged.", [
      f.ci.workflows ? `CI runs ${f.ci.workflows} workflows on every push. Fix any red check first.` : "Wait for a maintainer to review.",
      "Answer comments politely and push fixes to the same branch.",
      "Pull in upstream changes if the branch falls behind.",
    ], { commands: ["git pull --rebase upstream HEAD"], done: "A maintainer approves and merges the pull request." }),
  ]
}