"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalysisRootPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function openAnalysis() {
    const trimmed = value.trim();
    const match = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)(?:\/)?$/i);

    if (!match) {
      setError("Use a GitHub repo URL like https://github.com/vercel/next.js");
      return;
    }

    const owner = encodeURIComponent(match[1]);
    const repo = encodeURIComponent(match[2]);
    setError("");
    router.push(`/analysis/${owner}/${repo}`);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#090909", color: "#f5f5f5", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 680, border: "1px solid #1a1a1a", borderRadius: 20, background: "#111111", padding: 24 }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8ff3e" }}>Analysis</p>
        <h1 style={{ margin: "16px 0 12px", fontSize: 36, lineHeight: 1.1, letterSpacing: "-0.04em" }}>Open a repo analysis</h1>
        <p style={{ margin: 0, color: "#a0a0a0", lineHeight: 1.6 }}>
          Paste a public GitHub repository URL to open the repo-level analysis view.
        </p>

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") openAnalysis();
            }}
            placeholder="https://github.com/vercel/next.js"
            style={{
              flex: "1 1 320px",
              height: 48,
              borderRadius: 12,
              border: "1px solid #1d1d1d",
              background: "#0a0a0a",
              color: "#fff",
              padding: "0 14px",
              fontSize: 15,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={openAnalysis}
            style={{
              height: 48,
              borderRadius: 12,
              border: "none",
              background: "#a8ff3e",
              color: "#090909",
              fontWeight: 700,
              padding: "0 20px",
              cursor: "pointer",
            }}
          >
            Open
          </button>
        </div>

        {error ? (
          <p style={{ marginTop: 16, color: "#ff6b6b", fontSize: 14 }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}
