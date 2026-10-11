// Page-level CSS the Tailwind classes can't express: keyframes + the markdown look for chat replies.
// Inline <style> mirrors how the GitLense page ships its own, so there is nothing to wire into globals.css.
const CSS = `
@keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
/* The lit band is 200% tall; sliding it -50% -> 0 moves the band from the top to the bottom of any-height rail. */
@keyframes rail-scan { from { transform: translateY(-50%) } to { transform: translateY(0) } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }
}

.inline-code { color: #a8ff3e; background: rgba(168,255,62,0.06); border: 1px solid rgba(168,255,62,0.18); padding: 1px 6px; border-radius: 5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; overflow-wrap: anywhere; }

.prose-dark { color: #ccc; line-height: 1.7; font-size: 14.5px; overflow-wrap: anywhere; max-width: 66ch; text-wrap: pretty; }
.prose-dark > :first-child { margin-top: 0; }
.prose-dark > :last-child { margin-bottom: 0; }
.prose-dark h1,.prose-dark h2,.prose-dark h3 { color: #fff; font-weight: 600; margin: 1.2rem 0 0.4rem; letter-spacing: -0.2px; font-size: 15px; }
.prose-dark p { margin: 0 0 0.7rem; }
.prose-dark code { background: #111; color: #a8ff3e; padding: 1px 6px; border-radius: 4px; font-size: 12.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; border: 1px solid #1a1a1a; }
.prose-dark pre { background: #050505; border: 1px solid #141414; border-radius: 10px; padding: 0.85rem 1rem; overflow-x: auto; margin: 0.8rem 0; max-width: 100%; }
.prose-dark pre code { background: none; padding: 0; color: #ddd; border: none; }
/* Tailwind's preflight strips list markers, so chat answers need them put back. */
.prose-dark ul,.prose-dark ol { padding-left: 1.3rem; margin: 0 0 0.7rem; list-style-position: outside; }
.prose-dark ul { list-style-type: disc; }
.prose-dark ol { list-style-type: decimal; }
.prose-dark li::marker { color: #a8ff3e; }
.prose-dark li { margin-bottom: 0.3rem; }
.prose-dark strong { color: #fff; font-weight: 600; }
.prose-dark a { color: #a8ff3e; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(168,255,62,0.35); }
.prose-dark a:hover { text-decoration-color: #a8ff3e; }
`

export function AnalysisStyles() {
  return <style>{CSS}</style>
}
