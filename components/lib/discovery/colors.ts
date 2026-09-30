// GitHub's actual linguist colors for the common ones; everything else gets a
// deterministic (same language always same color) hash-based fallback so no
// language ever renders without a dot.

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d", C: "#555555", "C#": "#178600",
  PHP: "#4F5D95", Ruby: "#701516", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB",
  Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", Vue: "#41b883", Svelte: "#ff3e00",
  Zig: "#ec915c", Elixir: "#6e4a7e", Scala: "#c22d40", Lua: "#000080",
};

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 58%)`;
}

export function languageColor(lang: string | null | undefined): string {
  if (!lang) return "#666";
  return LANG_COLORS[lang] || hashColor(lang);
}
