import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const candidates = [
  path.join(root, "node_modules", ".prisma", "client"),
  path.join(root, "node_modules", "@prisma", "client"),
];

const isStalePrismaTemp = (name) => /\.tmp\d*$/.test(name) || name.includes(".tmp") || /query_engine.*\.tmp/.test(name);

const stripTempSuffix = (name) => name.replace(/\.tmp\d*$/, "");

for (const dir of candidates) {
  if (!fs.existsSync(dir)) continue;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!isStalePrismaTemp(entry.name)) continue;

    const tempTarget = path.join(dir, entry.name);
    const finalTarget = path.join(dir, stripTempSuffix(entry.name));
    const targetsToRemove = [tempTarget];

    if (finalTarget !== tempTarget && fs.existsSync(finalTarget)) {
      targetsToRemove.push(finalTarget);
    }

    for (const target of targetsToRemove) {
      try {
        fs.rmSync(target, { recursive: true, force: true });
        console.log(`[prisma-clean] removed stale file: ${target}`);
      } catch (error) {
        console.warn(`[prisma-clean] could not remove ${target}:`, error);
      }
    }
  }

  // Keep the generated Prisma engine in place when everything is healthy. When
  // an interrupted generate leaves a .tmp file behind, removing the matching final
  // engine lets Prisma regenerate it cleanly on Windows without the EPERM rename.
}
