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

    try {
      if (fs.existsSync(finalTarget)) {
        fs.rmSync(finalTarget, { recursive: true, force: true });
        console.log(`[prisma-clean] removed stale final file: ${finalTarget}`);
      }

      fs.rmSync(tempTarget, { recursive: true, force: true });
      console.log(`[prisma-clean] removed stale temp file: ${tempTarget}`);
    } catch (error) {
      console.warn(`[prisma-clean] could not remove stale Prisma artifact in ${dir}:`, error);
    }
  }
}

const generatedClientDir = path.join(root, "node_modules", ".prisma", "client");
if (fs.existsSync(generatedClientDir)) {
  try {
    fs.rmSync(generatedClientDir, { recursive: true, force: true });
    console.log(`[prisma-clean] removed generated Prisma client: ${generatedClientDir}`);
  } catch (error) {
    console.warn(`[prisma-clean] could not remove generated Prisma client:`, error);
  }
}

// Remove stale transient Prisma engines before regenerate so Windows won't hit
// the EPERM rename from a leftover .tmp engine file.
