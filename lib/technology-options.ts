import { createElement, type ComponentType, type CSSProperties } from "react"
import * as SiIcons from "react-icons/si"

export type TechCategory =
  | "Frontend"
  | "UI Libraries"
  | "Backend"
  | "Databases"
  | "ORM"
  | "Cloud & DevOps"
  | "APIs"
  | "Testing"
  | "Build Tools"
  | "AI"
  | "Mobile"
  | "Game Development"
  | "Data Science"
  | "Programming Languages"

export interface TechOption {
  value: string
  label: string
  icon: ComponentType<{ className?: string; size?: number; style?: CSSProperties }>
  iconColor: string
  /** Extra search terms — abbreviations, old names, common shorthand ("js" -> JavaScript). */
  aliases?: string[]
  category: TechCategory
}

/**
 * A handful of technologies (confirmed by checking the installed react-icons/si
 * package directly, not guessed) don't have an official Simple Icons mark —
 * some for trademark reasons (AWS's guidelines don't permit a redistributable
 * standalone SVG), some just haven't been contributed yet (Playwright, Parcel,
 * Matplotlib, gRPC, a standalone OpenAI mark). Rather than fake a brand icon,
 * these get a small lettered badge in the brand's own color instead.
 */
function letterIcon(text: string): ComponentType<{ className?: string; size?: number; style?: CSSProperties }> {
  return function LetterIcon({ className, style }) {
    return createElement(
      "span",
      {
        className,
        style: {
          ...style,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "8px",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          borderRadius: 3,
          background: "currentColor",
        },
      },
      createElement("span", { style: { color: "#0a0a0a" } }, text)
    )
  }
}

export const TECHNOLOGIES: TechOption[] = [
  // ---------- Frontend ----------
  { value: "html", label: "HTML", icon: SiIcons.SiHtml5, iconColor: "#E34F26", category: "Frontend" },
  { value: "css", label: "CSS", icon: SiIcons.SiCss, iconColor: "#1572B6", category: "Frontend" },
  { value: "react", label: "React", icon: SiIcons.SiReact, iconColor: "#61DAFB", category: "Frontend" },
  { value: "nextjs", label: "Next.js", icon: SiIcons.SiNextdotjs, iconColor: "#000000", aliases: ["next"], category: "Frontend" },
  { value: "vue", label: "Vue", icon: SiIcons.SiVuedotjs, iconColor: "#4FC08D", aliases: ["vuejs"], category: "Frontend" },
  { value: "nuxt", label: "Nuxt", icon: SiIcons.SiNuxt, iconColor: "#00DC82", category: "Frontend" },
  { value: "angular", label: "Angular", icon: SiIcons.SiAngular, iconColor: "#DD0031", aliases: ["ng"], category: "Frontend" },
  { value: "svelte", label: "Svelte", icon: SiIcons.SiSvelte, iconColor: "#FF3E00", category: "Frontend" },
  { value: "sveltekit", label: "SvelteKit", icon: SiIcons.SiSvelte, iconColor: "#FF3E00", category: "Frontend" },
  { value: "astro", label: "Astro", icon: SiIcons.SiAstro, iconColor: "#FF5D01", category: "Frontend" },
  { value: "remix", label: "Remix", icon: SiIcons.SiRemix, iconColor: "#000000", category: "Frontend" },
  { value: "solidjs", label: "SolidJS", icon: SiIcons.SiSolid, iconColor: "#2C4F7C", aliases: ["solid"], category: "Frontend" },
  { value: "qwik", label: "Qwik", icon: SiIcons.SiQwik, iconColor: "#18B6F6", category: "Frontend" },
  { value: "alpinejs", label: "Alpine.js", icon: SiIcons.SiAlpinedotjs, iconColor: "#8BC0D0", aliases: ["alpine"], category: "Frontend" },
  { value: "lit", label: "Lit", icon: SiIcons.SiLit, iconColor: "#324FFF", category: "Frontend" },
  { value: "electron", label: "Electron", icon: SiIcons.SiElectron, iconColor: "#47848F", category: "Frontend" },
  { value: "tauri", label: "Tauri", icon: SiIcons.SiTauri, iconColor: "#24C8DB", category: "Frontend" },

  // ---------- UI Libraries ----------
  { value: "tailwindcss", label: "Tailwind CSS", icon: SiIcons.SiTailwindcss, iconColor: "#06B6D4", aliases: ["tw", "tailwind"], category: "UI Libraries" },
  { value: "shadcnui", label: "shadcn/ui", icon: SiIcons.SiShadcnui, iconColor: "#FAFAFA", aliases: ["shadcn"], category: "UI Libraries" },
  { value: "bootstrap", label: "Bootstrap", icon: SiIcons.SiBootstrap, iconColor: "#7952B3", category: "UI Libraries" },
  { value: "materialui", label: "Material UI", icon: SiIcons.SiMui, iconColor: "#007FFF", aliases: ["mui"], category: "UI Libraries" },
  { value: "chakraui", label: "Chakra UI", icon: SiIcons.SiChakraui, iconColor: "#319795", aliases: ["chakra"], category: "UI Libraries" },
  { value: "antdesign", label: "Ant Design", icon: SiIcons.SiAntdesign, iconColor: "#1890FF", aliases: ["antd"], category: "UI Libraries" },
  { value: "mantine", label: "Mantine", icon: SiIcons.SiMantine, iconColor: "#339AF0", category: "UI Libraries" },
  { value: "radixui", label: "Radix UI", icon: SiIcons.SiRadixui, iconColor: "#8B5CF6", aliases: ["radix"], category: "UI Libraries" },
  { value: "framermotion", label: "Framer Motion", icon: SiIcons.SiFramer, iconColor: "#0055FF", aliases: ["framer"], category: "UI Libraries" },

  // ---------- Backend ----------
  { value: "nodejs", label: "Node.js", icon: SiIcons.SiNodedotjs, iconColor: "#5FA04E", aliases: ["node"], category: "Backend" },
  { value: "express", label: "Express", icon: SiIcons.SiExpress, iconColor: "#000000", category: "Backend" },
  { value: "nestjs", label: "NestJS", icon: SiIcons.SiNestjs, iconColor: "#E0234E", aliases: ["nest"], category: "Backend" },
  { value: "fastify", label: "Fastify", icon: SiIcons.SiFastify, iconColor: "#000000", category: "Backend" },
  { value: "hono", label: "Hono", icon: SiIcons.SiHono, iconColor: "#E36002", category: "Backend" },
  { value: "django", label: "Django", icon: SiIcons.SiDjango, iconColor: "#092E20", category: "Backend" },
  { value: "flask", label: "Flask", icon: SiIcons.SiFlask, iconColor: "#000000", category: "Backend" },
  { value: "fastapi", label: "FastAPI", icon: SiIcons.SiFastapi, iconColor: "#009688", category: "Backend" },
  { value: "laravel", label: "Laravel", icon: SiIcons.SiLaravel, iconColor: "#FF2D20", category: "Backend" },
  { value: "symfony", label: "Symfony", icon: SiIcons.SiSymfony, iconColor: "#000000", category: "Backend" },
  { value: "springboot", label: "Spring Boot", icon: SiIcons.SiSpringboot, iconColor: "#6DB33F", aliases: ["spring"], category: "Backend" },
  { value: "aspnetcore", label: "ASP.NET Core", icon: SiIcons.SiDotnet, iconColor: "#512BD4", aliases: ["asp.net", "dotnet"], category: "Backend" },
  { value: "rubyonrails", label: "Ruby on Rails", icon: SiIcons.SiRubyonrails, iconColor: "#D30001", aliases: ["rails"], category: "Backend" },
  { value: "phoenix", label: "Phoenix", icon: SiIcons.SiPhoenixframework, iconColor: "#FD4F00", category: "Backend" },

  // ---------- Databases ----------
  { value: "postgresql", label: "PostgreSQL", icon: SiIcons.SiPostgresql, iconColor: "#336791", aliases: ["postgres", "pg"], category: "Databases" },
  { value: "mysql", label: "MySQL", icon: SiIcons.SiMysql, iconColor: "#4479A1", category: "Databases" },
  { value: "sqlite", label: "SQLite", icon: SiIcons.SiSqlite, iconColor: "#003B57", category: "Databases" },
  { value: "mongodb", label: "MongoDB", icon: SiIcons.SiMongodb, iconColor: "#47A248", aliases: ["mongo"], category: "Databases" },
  { value: "redis", label: "Redis", icon: SiIcons.SiRedis, iconColor: "#DC382D", category: "Databases" },
  { value: "mariadb", label: "MariaDB", icon: SiIcons.SiMariadb, iconColor: "#003545", category: "Databases" },
  { value: "supabase", label: "Supabase", icon: SiIcons.SiSupabase, iconColor: "#3FCF8E", category: "Databases" },
  { value: "firebase", label: "Firebase", icon: SiIcons.SiFirebase, iconColor: "#DD2C00", category: "Databases" },
  { value: "appwrite", label: "Appwrite", icon: SiIcons.SiAppwrite, iconColor: "#FD366E", category: "Databases" },
  { value: "planetscale", label: "PlanetScale", icon: SiIcons.SiPlanetscale, iconColor: "#000000", category: "Databases" },
  { value: "cockroachdb", label: "CockroachDB", icon: SiIcons.SiCockroachlabs, iconColor: "#6933FF", category: "Databases" },
  { value: "cassandra", label: "Cassandra", icon: SiIcons.SiApachecassandra, iconColor: "#1287B1", category: "Databases" },

  // ---------- ORM ----------
  { value: "prisma", label: "Prisma", icon: SiIcons.SiPrisma, iconColor: "#8B8CF9", category: "ORM" },
  { value: "drizzleorm", label: "Drizzle ORM", icon: SiIcons.SiDrizzle, iconColor: "#C5F74F", aliases: ["drizzle"], category: "ORM" },
  { value: "sequelize", label: "Sequelize", icon: SiIcons.SiSequelize, iconColor: "#52B0E7", category: "ORM" },
  { value: "typeorm", label: "TypeORM", icon: letterIcon("TO"), iconColor: "#E83524", category: "ORM" },
  { value: "mongoose", label: "Mongoose", icon: letterIcon("MG"), iconColor: "#880000", category: "ORM" },
  { value: "hibernate", label: "Hibernate", icon: SiIcons.SiHibernate, iconColor: "#59666C", category: "ORM" },

  // ---------- Cloud & DevOps ----------
  { value: "docker", label: "Docker", icon: SiIcons.SiDocker, iconColor: "#2496ED", category: "Cloud & DevOps" },
  { value: "kubernetes", label: "Kubernetes", icon: SiIcons.SiKubernetes, iconColor: "#326CE5", aliases: ["k8s"], category: "Cloud & DevOps" },
  { value: "terraform", label: "Terraform", icon: SiIcons.SiTerraform, iconColor: "#844FBA", aliases: ["tf"], category: "Cloud & DevOps" },
  { value: "aws", label: "AWS", icon: letterIcon("AWS"), iconColor: "#FF9900", category: "Cloud & DevOps" },
  { value: "azure", label: "Azure", icon: letterIcon("AZ"), iconColor: "#0078D4", category: "Cloud & DevOps" },
  { value: "googlecloud", label: "Google Cloud", icon: SiIcons.SiGooglecloud, iconColor: "#4285F4", aliases: ["gcp"], category: "Cloud & DevOps" },
  { value: "cloudflare", label: "Cloudflare", icon: SiIcons.SiCloudflare, iconColor: "#F38020", category: "Cloud & DevOps" },
  { value: "nginx", label: "Nginx", icon: SiIcons.SiNginx, iconColor: "#009639", category: "Cloud & DevOps" },
  { value: "apache", label: "Apache", icon: SiIcons.SiApache, iconColor: "#D22128", category: "Cloud & DevOps" },
  { value: "vercel", label: "Vercel", icon: SiIcons.SiVercel, iconColor: "#000000", category: "Cloud & DevOps" },
  { value: "netlify", label: "Netlify", icon: SiIcons.SiNetlify, iconColor: "#00C7B7", category: "Cloud & DevOps" },
  { value: "railway", label: "Railway", icon: SiIcons.SiRailway, iconColor: "#0B0D0E", category: "Cloud & DevOps" },
  { value: "render", label: "Render", icon: letterIcon("RD"), iconColor: "#46E3B7", category: "Cloud & DevOps" },
  { value: "flyio", label: "Fly.io", icon: SiIcons.SiFlydotio, iconColor: "#8B5CF6", aliases: ["fly"], category: "Cloud & DevOps" },

  // ---------- APIs ----------
  { value: "restapi", label: "REST API", icon: letterIcon("API"), iconColor: "#FF6B35", aliases: ["rest"], category: "APIs" },
  { value: "graphql", label: "GraphQL", icon: SiIcons.SiGraphql, iconColor: "#E10098", aliases: ["gql"], category: "APIs" },
  { value: "trpc", label: "tRPC", icon: SiIcons.SiTrpc, iconColor: "#398CCB", category: "APIs" },
  { value: "grpc", label: "gRPC", icon: letterIcon("RPC"), iconColor: "#4285F4", category: "APIs" },
  { value: "openapi", label: "OpenAPI", icon: SiIcons.SiOpenapiinitiative, iconColor: "#6BA539", aliases: ["swagger"], category: "APIs" },

  // ---------- Testing ----------
  { value: "jest", label: "Jest", icon: SiIcons.SiJest, iconColor: "#C21325", category: "Testing" },
  { value: "vitest", label: "Vitest", icon: SiIcons.SiVitest, iconColor: "#6E9F18", category: "Testing" },
  { value: "playwright", label: "Playwright", icon: letterIcon("PW"), iconColor: "#2EAD33", category: "Testing" },
  { value: "cypress", label: "Cypress", icon: SiIcons.SiCypress, iconColor: "#69D3A7", category: "Testing" },
  { value: "testinglibrary", label: "Testing Library", icon: SiIcons.SiTestinglibrary, iconColor: "#E33332", category: "Testing" },
  { value: "mocha", label: "Mocha", icon: SiIcons.SiMocha, iconColor: "#8D6748", category: "Testing" },

  // ---------- Build Tools ----------
  { value: "vite", label: "Vite", icon: SiIcons.SiVite, iconColor: "#BD93F9", category: "Build Tools" },
  { value: "webpack", label: "Webpack", icon: SiIcons.SiWebpack, iconColor: "#8DD6F9", category: "Build Tools" },
  { value: "rollup", label: "Rollup", icon: SiIcons.SiRollupdotjs, iconColor: "#EC4A3F", category: "Build Tools" },
  { value: "parcel", label: "Parcel", icon: letterIcon("PCL"), iconColor: "#E9A23B", category: "Build Tools" },
  { value: "babel", label: "Babel", icon: SiIcons.SiBabel, iconColor: "#F9DC3E", category: "Build Tools" },
  { value: "swc", label: "SWC", icon: SiIcons.SiSwc, iconColor: "#FFFFFF", category: "Build Tools" },
  { value: "esbuild", label: "esbuild", icon: SiIcons.SiEsbuild, iconColor: "#FFCF00", category: "Build Tools" },
  { value: "turbopack", label: "Turbopack", icon: letterIcon("TP"), iconColor: "#0096FF", category: "Build Tools" },

  // ---------- AI ----------
  { value: "openai", label: "OpenAI", icon: letterIcon("AI"), iconColor: "#10A37F", category: "AI" },
  { value: "langchain", label: "LangChain", icon: SiIcons.SiLangchain, iconColor: "#1C3C3C", category: "AI" },
  { value: "llamaindex", label: "LlamaIndex", icon: letterIcon("LI"), iconColor: "#4B32C3", category: "AI" },
  { value: "ollama", label: "Ollama", icon: SiIcons.SiOllama, iconColor: "#FFFFFF", category: "AI" },
  { value: "huggingface", label: "Hugging Face", icon: SiIcons.SiHuggingface, iconColor: "#FFD21E", aliases: ["hf"], category: "AI" },
  { value: "tensorflow", label: "TensorFlow", icon: SiIcons.SiTensorflow, iconColor: "#FF6F00", aliases: ["tf"], category: "AI" },
  { value: "pytorch", label: "PyTorch", icon: SiIcons.SiPytorch, iconColor: "#EE4C2C", category: "AI" },

  // ---------- Mobile ----------
  { value: "android", label: "Android", icon: SiIcons.SiAndroid, iconColor: "#3DDC84", category: "Mobile" },
  { value: "ios", label: "iOS", icon: letterIcon("iOS"), iconColor: "#007AFF", category: "Mobile" },
  { value: "reactnative", label: "React Native", icon: SiIcons.SiReact, iconColor: "#61DAFB", aliases: ["rn"], category: "Mobile" },
  { value: "flutter", label: "Flutter", icon: SiIcons.SiFlutter, iconColor: "#02569B", category: "Mobile" },
  { value: "expo", label: "Expo", icon: SiIcons.SiExpo, iconColor: "#000020", category: "Mobile" },

  // ---------- Game Development ----------
  { value: "unity", label: "Unity", icon: SiIcons.SiUnity, iconColor: "#FFFFFF", category: "Game Development" },
  { value: "unrealengine", label: "Unreal Engine", icon: SiIcons.SiUnrealengine, iconColor: "#FFFFFF", aliases: ["ue", "ue5"], category: "Game Development" },
  { value: "godot", label: "Godot", icon: SiIcons.SiGodotengine, iconColor: "#478CBF", category: "Game Development" },
  { value: "bevy", label: "Bevy", icon: SiIcons.SiBevy, iconColor: "#232326", category: "Game Development" },

  // ---------- Data Science ----------
  { value: "pandas", label: "Pandas", icon: SiIcons.SiPandas, iconColor: "#150458", category: "Data Science" },
  { value: "numpy", label: "NumPy", icon: SiIcons.SiNumpy, iconColor: "#013243", category: "Data Science" },
  { value: "matplotlib", label: "Matplotlib", icon: letterIcon("PLT"), iconColor: "#11557C", category: "Data Science" },
  { value: "jupyter", label: "Jupyter", icon: SiIcons.SiJupyter, iconColor: "#F37626", category: "Data Science" },

  // ---------- Programming Languages ----------
  { value: "javascript", label: "JavaScript", icon: SiIcons.SiJavascript, iconColor: "#F7DF1E", aliases: ["js"], category: "Programming Languages" },
  { value: "typescript", label: "TypeScript", icon: SiIcons.SiTypescript, iconColor: "#3178C6", aliases: ["ts"], category: "Programming Languages" },
  { value: "python", label: "Python", icon: SiIcons.SiPython, iconColor: "#3776AB", aliases: ["py"], category: "Programming Languages" },
  { value: "go", label: "Go", icon: SiIcons.SiGo, iconColor: "#00ADD8", aliases: ["golang"], category: "Programming Languages" },
  { value: "rust", label: "Rust", icon: SiIcons.SiRust, iconColor: "#DEA584", category: "Programming Languages" },
  { value: "java", label: "Java", icon: SiIcons.SiOpenjdk, iconColor: "#007396", category: "Programming Languages" },
  { value: "kotlin", label: "Kotlin", icon: SiIcons.SiKotlin, iconColor: "#7F52FF", category: "Programming Languages" },
  { value: "swift", label: "Swift", icon: SiIcons.SiSwift, iconColor: "#F05138", category: "Programming Languages" },
  { value: "c", label: "C", icon: SiIcons.SiC, iconColor: "#A8B9CC", category: "Programming Languages" },
  { value: "cplusplus", label: "C++", icon: SiIcons.SiCplusplus, iconColor: "#00599C", aliases: ["cpp"], category: "Programming Languages" },
  { value: "csharp", label: "C#", icon: SiIcons.SiSharp, iconColor: "#239120", aliases: ["cs", "dotnet"], category: "Programming Languages" },
  { value: "php", label: "PHP", icon: SiIcons.SiPhp, iconColor: "#777BB4", category: "Programming Languages" },
  { value: "ruby", label: "Ruby", icon: SiIcons.SiRuby, iconColor: "#CC342D", aliases: ["rb"], category: "Programming Languages" },
  { value: "dart", label: "Dart", icon: SiIcons.SiDart, iconColor: "#0175C2", category: "Programming Languages" },
  { value: "scala", label: "Scala", icon: SiIcons.SiScala, iconColor: "#DC322F", category: "Programming Languages" },
  { value: "elixir", label: "Elixir", icon: SiIcons.SiElixir, iconColor: "#4B275F", category: "Programming Languages" },
  { value: "haskell", label: "Haskell", icon: SiIcons.SiHaskell, iconColor: "#5D4F85", category: "Programming Languages" },
  { value: "lua", label: "Lua", icon: SiIcons.SiLua, iconColor: "#2C2D72", category: "Programming Languages" },
  { value: "r", label: "R", icon: SiIcons.SiR, iconColor: "#276DC3", category: "Programming Languages" },
  { value: "julia", label: "Julia", icon: SiIcons.SiJulia, iconColor: "#9558B2", category: "Programming Languages" },
  { value: "zig", label: "Zig", icon: SiIcons.SiZig, iconColor: "#F7A41D", category: "Programming Languages" },
  { value: "nim", label: "Nim", icon: SiIcons.SiNim, iconColor: "#FFC200", category: "Programming Languages" },
  { value: "ocaml", label: "OCaml", icon: SiIcons.SiOcaml, iconColor: "#EC6813", category: "Programming Languages" },
  { value: "perl", label: "Perl", icon: SiIcons.SiPerl, iconColor: "#39457E", category: "Programming Languages" },
  { value: "bash", label: "Bash", icon: SiIcons.SiGnubash, iconColor: "#4EAA25", category: "Programming Languages" },
  { value: "powershell", label: "PowerShell", icon: SiIcons.SiPowers, iconColor: "#5391FE", aliases: ["pwsh"], category: "Programming Languages" },
  { value: "solidity", label: "Solidity", icon: SiIcons.SiSolidity, iconColor: "#363636", category: "Programming Languages" },
  { value: "sql", label: "SQL", icon: letterIcon("SQL"), iconColor: "#4479A1", category: "Programming Languages" },
  { value: "shell", label: "Shell", icon: SiIcons.SiShell, iconColor: "#4EAA25", category: "Programming Languages" },
  { value: "groovy", label: "Groovy", icon: SiIcons.SiApachegroovy, iconColor: "#4298B8", category: "Programming Languages" },
  { value: "objectivec", label: "Objective-C", icon: SiIcons.SiApple, iconColor: "#A2AAAD", category: "Programming Languages" },
  { value: "fsharp", label: "F#", icon: SiIcons.SiFsharp, iconColor: "#378BBA", category: "Programming Languages" },
  { value: "clojure", label: "Clojure", icon: SiIcons.SiClojure, iconColor: "#5881D8", category: "Programming Languages" },
  { value: "erlang", label: "Erlang", icon: SiIcons.SiErlang, iconColor: "#A90533", category: "Programming Languages" },
  { value: "gleam", label: "Gleam", icon: SiIcons.SiGleam, iconColor: "#FFAFF3", category: "Programming Languages" },
]

/** Curated shortcut row shown above the categories (matches the spec's "Popular" list). */
export const POPULAR_VALUES = [
  "react", "nextjs", "typescript", "nodejs", "python",
  "docker", "postgresql", "tailwindcss", "prisma", "mongodb",
]

/** Display order for category groups in the dropdown. */
export const CATEGORY_ORDER: TechCategory[] = [
  "Frontend", "UI Libraries", "Backend", "Databases", "ORM",
  "Cloud & DevOps", "APIs", "Testing", "Build Tools", "AI",
  "Mobile", "Game Development", "Data Science", "Programming Languages",
]

export const TECH_BY_VALUE: Record<string, TechOption> = Object.fromEntries(
  TECHNOLOGIES.map((t) => [t.value, t])
)

export type TechGroup = { label: string; options: TechOption[] }

/**
 * Builds the full grouped option list react-select renders: Recently Used,
 * then Popular, then every category in CATEGORY_ORDER. Pass the recent
 * values read from localStorage (most-recent first, already capped at 8).
 */
export function buildGroupedOptions(recentValues: string[]): TechGroup[] {
  const groups: TechGroup[] = []

  const recent = recentValues.map((v) => TECH_BY_VALUE[v]).filter(Boolean)
  if (recent.length > 0) {
    groups.push({ label: "Recently Used", options: recent })
  }

  groups.push({
    label: "⭐ Popular",
    options: POPULAR_VALUES.map((v) => TECH_BY_VALUE[v]).filter(Boolean),
  })

  for (const category of CATEGORY_ORDER) {
    groups.push({
      label: category,
      options: TECHNOLOGIES.filter((t) => t.category === category),
    })
  }

  return groups
}

const RECENT_KEY = "oshunt:recent-technologies"
const RECENT_LIMIT = 8

export function getRecentTechnologies(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []
  } catch {
    return []
  }
}

/** Call with the value(s) just selected — moves them to the front, dedupes, caps at 8. */
export function recordRecentTechnology(values: string | string[]): string[] {
  if (typeof window === "undefined") return []
  const picked = Array.isArray(values) ? values : [values]
  const current = getRecentTechnologies()
  const next = [...picked, ...current.filter((v) => !picked.includes(v))].slice(0, RECENT_LIMIT)
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — fail silently, it's a convenience feature only
  }
  return next
}

/** Alias-aware filter for react-select's filterOption prop. */
export function filterTechnology(option: { data: TechOption }, rawInput: string): boolean {
  const q = rawInput.trim().toLowerCase()
  if (!q) return true
  const t = option.data
  if (t.label.toLowerCase().includes(q)) return true
  if (t.value.toLowerCase().includes(q)) return true
  return (t.aliases || []).some((a) => a.toLowerCase().includes(q))
}