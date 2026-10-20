import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

if (process.platform !== 'win32') process.exit(0);

const root = process.cwd();
const schema = path.join(root, 'prisma', 'backend', 'schema.prisma');
const clientDir = path.join(root, 'node_modules', '.prisma', 'client');
const engineCandidates = [
  path.join(clientDir, 'query_engine-windows.dll.node'),
  path.join(clientDir, 'query-engine-windows.exe'),
];
const hasWindowsEngine = engineCandidates.some((file) => fs.existsSync(file));
const index = path.join(clientDir, 'index.js');
const needsGenerate = !hasWindowsEngine || (fs.existsSync(schema) && fs.existsSync(index) && fs.statSync(schema).mtimeMs > fs.statSync(index).mtimeMs);

if (!needsGenerate) process.exit(0);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const runGenerate = () => {
  const cmd = `npx prisma generate --schema=prisma/backend/schema.prisma`;
  return spawnSync(cmd, { shell: true, stdio: 'inherit' });
};

(async () => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = runGenerate();
    if (result.status === 0) process.exit(0);
    const text = `${result.stderr ?? ''}${result.stdout ?? ''}`.toLowerCase();
    if (!/eperm|ebusy|access is denied|being used by another process|file is being used/i.test(text)) process.exit(result.status ?? 1);
    if (attempt === 0) await wait(1500);
  }
  console.error('[prisma-predev] Prisma could not regenerate the Windows Query Engine because another Node process is still holding it.');
  console.error('Close the stale Node process, then run: taskkill //F //IM node.exe');
  console.error('PowerShell: taskkill /F /IM node.exe');
  process.exit(1);
})();
