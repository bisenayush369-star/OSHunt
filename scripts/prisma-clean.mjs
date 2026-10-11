import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const candidates = [
  path.join(root, "node_modules", ".prisma", "client"),
  path.join(root, "node_modules", "@prisma", "client"),
];

const isStalePrismaTemp = (name) => /\.tmp\d*$/.test(name) || name.includes(".tmp") || /query_engine.*\.tmp/.test(name);

for (const dir of candidates) {
  if (!fs.existsSync(dir)) continue;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!isStalePrismaTemp(entry.name)) continue;

    const target = path.join(dir, entry.name);
    try {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`[prisma-clean] removed stale file: ${target}`);
    } catch (error) {
      console.warn(`[prisma-clean] could not remove ${target}:`, error);
    }
  }

  // Keep the generated Prisma engine in place. Removing it causes on-start
  // Prisma Client initialization failures and leads to 500s from routes like
  // /api/usage that depend on the generated client.
}
