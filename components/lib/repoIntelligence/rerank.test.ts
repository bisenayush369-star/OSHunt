import test from "node:test"
import assert from "node:assert/strict"
import { rerankAfterReading } from "./rerank"
import type { ImportGraph } from "./ast/importGraph"
import type { SymbolIndex } from "./types"

test("rerankAfterReading rewards recent files and symbol matches", () => {
  const files = [
    { path: "src/feature.ts", score: 20, reason: "base" },
    { path: "src/userService.ts", score: 20, reason: "base" },
  ]

  const importGraph: ImportGraph = {
    edges: [],
    importedBy: new Map([["src/userService.ts", ["src/feature.ts"]]]),
    imports: new Map(),
  }

  const symbolIndex: SymbolIndex = new Map([
    [
      "UserService",
      [{ name: "UserService", kind: "class", path: "src/userService.ts", line: 1 }],
    ],
  ])

  const reranked = rerankAfterReading(files, importGraph, symbolIndex, "UserService", ["src/userService.ts"])

  assert.equal(reranked[0].path, "src/userService.ts")
  assert.ok(reranked[0].finalScore > reranked[1].finalScore)
})
