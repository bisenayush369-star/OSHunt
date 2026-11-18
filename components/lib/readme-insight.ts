// Reads a README the way a person skims it: the first real paragraph, the section that says why the project exists,
// who it is for, what it can do, how to start, and which tools it names. Plain rules, no model. Every field is text
// that is in the README (or null when the README does not say), and `from` names the heading it came from so the
// screen can say where it was read.

export type ReadmeBlock = { from: string; text: string }
export type ReadmeList = { from: string; items: string[] }
export type ReadmeStart = { from: string; lines: string[] }
export type ReadmeInsight = {
  summary: string
  why: ReadmeBlock | null
  useCases: ReadmeList | null
  features: ReadmeList | null
  start: ReadmeStart | null
  stack: string[]
  outline: string[]
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "code"; info: string; lines: string[] }
  | { kind: "other" }
type Section = { level: number; title: string; blocks: Block[] }

const MAX_README_CHARS = 120_000

// ─── Text cleanup ──────────────────────────────────────────────────────────

function stripHtml(md: string) {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<picture[\s\S]*?<\/picture>/gi, "")
    .replace(/<(?:img|source|br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/?(?:p|div|details|summary|h[1-6]|center|table|tr|td|th|thead|tbody|ul|ol|li|a|b|i|em|strong|span|sub|sup|kbd|code|pre)\b[^>]*>/gi, "\n")
}

// Links, images, emphasis and code ticks go; the words stay.
function plain(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[*_~`]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// "🚀 Why Foo?" -> "Why Foo?" (leading emoji, numbers and punctuation are dropped, so section names match).
const headingText = (raw: string) => plain(raw).replace(/^[^\p{L}\p{N}]+/u, "").replace(/^\d+[.)]\s+/, "").trim()

function limit(text: string, max: number) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "))
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1)
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max).trimEnd()}…`
}

const isCjk = (text: string) => /[぀-ヿ㐀-鿿가-힯]/.test(text)
// A paragraph worth showing: long enough, mostly words, not a row of links or a language switcher.
function informative(text: string, min = 40) {
  if (text.length < (isCjk(text) ? 18 : min)) return false
  if ((text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) < text.length * 0.6) return false
  if (/^(table of contents|contents|english|简体中文|日本語|español)\b/i.test(text)) return false
  if ((text.match(/\s[|·•]\s/g)?.length ?? 0) >= 3) return false
  return true
}

// ─── Structure ─────────────────────────────────────────────────────────────

function toSections(md: string): Section[] {
  const sections: Section[] = [{ level: 0, title: "", blocks: [] }]
  let para: string[] = []
  let list: string[] | null = null
  let fence: { ch: string; info: string; buf: string[] } | null = null
  const cur = () => sections[sections.length - 1]
  const push = (b: Block) => {
    const blocks = cur().blocks
    const last = blocks[blocks.length - 1]
    if (b.kind === "ul" && last?.kind === "ul") last.items.push(...b.items) // a list with blank lines between items
    else blocks.push(b)
  }
  const flushPara = () => {
    if (para.length) push({ kind: "p", text: plain(para.join(" ")) })
    para = []
  }
  const flushList = () => {
    if (list?.length) push({ kind: "ul", items: list.map(plain).filter(Boolean) })
    list = null
  }
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "")
    const f = /^\s*(`{3,}|~{3,})\s*([\w+-]*)/.exec(line)
    if (fence) {
      if (f && f[1][0] === fence.ch && !f[2]) {
        push({ kind: "code", info: fence.info.toLowerCase(), lines: fence.buf })
        fence = null
      } else fence.buf.push(line)
      continue
    }
    if (f) {
      flushPara()
      flushList()
      fence = { ch: f[1][0], info: f[2] ?? "", buf: [] }
      continue
    }
    const h = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line)
    if (h) {
      flushPara()
      flushList()
      sections.push({ level: h[1].length, title: headingText(h[2]), blocks: [] })
      continue
    }
    if (!line.trim()) {
      flushPara()
      continue
    }
    const li = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/.exec(line)
    if (li) {
      flushPara()
      ;(list ??= []).push(li[1])
      continue
    }
    if (list && /^\s{2,}\S/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`
      continue
    }
    flushList()
    if (/^\s*\|/.test(line) || /^\s*(?:[-*_]\s*){3,}$/.test(line)) {
      flushPara()
      push({ kind: "other" })
      continue
    }
    para.push(line.replace(/^\s*>\s?/, "").replace(/^\[!\w+\]\s*/, ""))
  }
  flushPara()
  flushList()
  if (fence) push({ kind: "code", info: fence.info.toLowerCase(), lines: fence.buf })
  return sections
}

// ─── What each section is about ────────────────────────────────────────────

const USE = /\b(use[- ]?cases?|who (is|are) (this|it|these)|who should|who needs|who uses|when (to|should) (you )?use|ideal for|good for|great for|best for|applications?|scenarios?|real[- ]world|what (can|could|do) (you|i|we) (do|build|make|use)|what (can|could) (it|this) (do|be used)|used (for|by|in|to)|in the wild)\b/i
const FEATURES = /\b(features?|highlights?|key (features|points|benefits)|capabilit(y|ies)|what (you get|it does|is included|is inside)|why (use|choose)|benefits|functionality)\b/i
const START = /\b(quick ?start|getting started|get started|installation|install|set ?up|usage|how to (use|run|install)|run (it|locally)|try it)\b/i
const STACK = /\b(tech(nology)? ?stack|built (with|on)|powered by|made with|dependencies|requirements|prerequisites|architecture|under the hood|how it works|stack|libraries)\b/i
const WHY = /^(why|motivation|background|about|overview|introduction|intro|what (is|are)|what's|the (problem|idea|story)|problem|goals?|philosophy|rationale|description|summary|vision|mission)\b/i

const COMMAND = /^(?:\$\s*)?(?:sudo\s+)?(npm|npx|pnpm|yarn|bun|bunx|deno|pip3?|pipx|uv|poetry|conda|cargo|go|git|docker|docker-compose|brew|apt(?:-get)?|curl|wget|make|cmake|gem|bundle|composer|dotnet|mvn|gradle|flutter|dart|julia|nix|helm|kubectl|python3?|node|java|ollama|winget|choco|scoop|irm|iwr)\b/
const SHELLISH = new Set(["", "bash", "sh", "shell", "zsh", "console", "terminal", "cmd", "powershell", "ps1", "fish", "text", "txt"])

function commandsOf(blocks: Block[], installOnly = false): string[] | null {
  for (const b of blocks) {
    if (b.kind !== "code" || !SHELLISH.has(b.info)) continue
    const lines = b.lines.map(l => l.trim().replace(/^\$\s+/, "")).filter(l => l && !l.startsWith("#") && !l.startsWith("//"))
    if (!lines.length || !COMMAND.test(lines[0])) continue
    if (installOnly && !/^(npm|pnpm|yarn|bun|pip3?|pipx|uv|cargo|go|brew|docker|gem|composer|curl|ollama)\b/.test(lines[0])) continue
    return lines.slice(0, 6).map(l => (l.length > 180 ? l.slice(0, 180) : l))
  }
  return null
}

const sentences = (text: string) => text.match(/[^.!?。]+[.!?。]+(?:\s|$)|[^.!?。]+$/g)?.map(s => s.trim()).filter(Boolean) ?? []

// ─── Tools named in the README ─────────────────────────────────────────────

// Capitalised on purpose where the lower-case word is also plain English (react, express, bun).
const TECH: [string, RegExp][] = [
  ["React", /\bReact(?:\.?js)?\b/],
  ["Next.js", /\bNext\.?js\b/i],
  ["Vue", /\bVue(?:\.?js)?\b/],
  ["Svelte", /\bSvelte(?:Kit)?\b/],
  ["Angular", /\bAngular\b/],
  ["Node.js", /\bNode\.?js\b/i],
  ["Deno", /\bDeno\b/],
  ["Bun", /\bBun\b/],
  ["Express", /\bexpress\.?js\b/i],
  ["Tailwind CSS", /\bTailwind(?:\s?CSS)?\b/i],
  ["Vite", /\bVite\b/],
  ["Webpack", /\bwebpack\b/i],
  ["Redux", /\bRedux\b/],
  ["Three.js", /\bThree\.?js\b/i],
  ["Tauri", /\bTauri\b/],
  ["Electron", /\bElectron\b/],
  ["Flutter", /\bFlutter\b/],
  ["Django", /\bDjango\b/],
  ["Flask", /\bFlask\b/],
  ["FastAPI", /\bFastAPI\b/i],
  ["PyTorch", /\bPyTorch\b/i],
  ["TensorFlow", /\bTensorFlow\b/i],
  ["NumPy", /\bNumPy\b/i],
  ["pandas", /\bpandas\b/],
  ["LangChain", /\bLangChain\b/i],
  ["Hugging Face", /\bHugging ?Face\b/i],
  ["Ollama", /\bOllama\b/],
  ["OpenAI", /\bOpenAI\b/],
  ["PostgreSQL", /\bPostgre(?:SQL|s)\b/i],
  ["MySQL", /\bMySQL\b/i],
  ["SQLite", /\bSQLite\b/i],
  ["MongoDB", /\bMongo(?:DB)?\b/],
  ["Redis", /\bRedis\b/],
  ["Prisma", /\bPrisma\b/],
  ["GraphQL", /\bGraphQL\b/i],
  ["Supabase", /\bSupabase\b/i],
  ["Firebase", /\bFirebase\b/i],
  ["Docker", /\bDocker(?:file|\s?compose)?\b/i],
  ["Kubernetes", /\bKubernetes\b|\bk8s\b/i],
  ["Terraform", /\bTerraform\b/i],
  ["GitHub Actions", /\bGitHub Actions\b/i],
  ["WebAssembly", /\bWebAssembly\b|\bWASM\b/],
  ["Nginx", /\bnginx\b/i],
  ["Cloudflare", /\bCloudflare\b/i],
  ["Vercel", /\bVercel\b/i],
  ["gRPC", /\bgRPC\b/i],
  ["WebSocket", /\bWebSockets?\b/i],
]

function stackOf(markdown: string, text: string, stackText: string, topics: string[]): string[] {
  // Badges name a tool even when the text does not: ![React](…/badge/React-61DAFB?logo=react).
  const badges = decodeURIComponent((markdown.match(/(?:logo=|badge\/)[A-Za-z0-9._%+-]+/g) ?? []).join(" ").replace(/%(?![0-9a-f]{2})/gi, "")).replace(/[-_]/g, " ")
  const topicText = topics.join(" ").replace(/-/g, " ")
  const found: [string, number][] = []
  for (const [name, re] of TECH) {
    const loose = new RegExp(re.source, "i")
    const strong = loose.test(badges) || loose.test(topicText) || re.test(stackText)
    const n = text.match(new RegExp(re.source, `g${re.flags.replace("g", "")}`))?.length ?? 0
    if (strong || n >= 2) found.push([name, (strong ? 100 : 0) + n])
  }
  return found.sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name)
}

// ─── Entry point ───────────────────────────────────────────────────────────

export function readReadme(source: string, topics: string[] = [], description = ""): ReadmeInsight {
  const markdown = source.slice(0, MAX_README_CHARS).replace(/\r\n?/g, "\n")
  const sections = toSections(stripHtml(markdown))
  const text = sections.flatMap(s => s.blocks.flatMap(b => (b.kind === "p" ? [b.text] : b.kind === "ul" ? b.items : []))).join("\n")
  const desc = plain(description).toLowerCase()

  // The first real paragraph, skipping one that only repeats the repository description.
  const lead = [sections[0], ...sections.slice(1, 3)].flatMap(s => s.blocks)
  const paras = lead.flatMap(b => (b.kind === "p" && informative(b.text) ? [b.text] : []))
  const summaryIdx = paras.findIndex(p => p.toLowerCase() !== desc && !desc.startsWith(p.toLowerCase().slice(0, 60)))
  const summary = summaryIdx >= 0 ? limit(paras[summaryIdx], 320) : ""

  let why: ReadmeBlock | null = null
  let useCases: ReadmeList | null = null
  let features: ReadmeList | null = null
  let start: ReadmeStart | null = null
  let stackText = ""

  for (const s of sections.slice(1)) {
    const name = s.title
    const ps = s.blocks.flatMap(b => (b.kind === "p" && informative(b.text, 30) ? [b.text] : []))
    const items = s.blocks.flatMap(b => (b.kind === "ul" ? b.items.filter(i => i.length >= 8) : []))
    if (STACK.test(name)) stackText += `\n${[...ps, ...items].join("\n")}`
    if (!useCases && USE.test(name)) {
      const list = items.length ? items.slice(0, 6) : sentences(ps.join(" ")).slice(0, 3)
      if (list.length) useCases = { from: name, items: list.map(i => limit(i, 150)) }
    } else if (!features && FEATURES.test(name) && !START.test(name)) {
      const list = items.length ? items.slice(0, 8) : sentences(ps.join(" ")).slice(0, 4)
      if (list.length >= 2) features = { from: name, items: list.map(i => limit(i, 130)) }
    }
    if (!why && WHY.test(name) && ps.length && !USE.test(name)) why = { from: name, text: limit(ps.slice(0, 2).join(" "), 520) }
    if (!start && START.test(name)) {
      const lines = commandsOf(s.blocks)
      if (lines) start = { from: name, lines }
    }
  }
  // No "why" heading: the paragraph after the summary is the next best account of what the project is for.
  if (!why && paras.length > summaryIdx + 1 && summaryIdx >= 0) why = { from: "Introduction", text: limit(paras[summaryIdx + 1], 520) }
  if (!start) {
    const lines = commandsOf(sections.flatMap(s => s.blocks), true)
    if (lines) start = { from: "README", lines }
  }

  const outline = [...new Set(sections.filter(s => s.level >= 2 && s.level <= 3 && s.title && s.title.length <= 60 && !/^(table of )?contents$/i.test(s.title)).map(s => s.title))].slice(0, 14)

  return { summary, why, useCases, features, start, stack: stackOf(markdown, text, stackText, topics), outline }
}