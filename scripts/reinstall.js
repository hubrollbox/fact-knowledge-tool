import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { resolve } from 'path';

const projectDir = resolve('/vercel/share/v0-project');

// Remove all lockfiles and node_modules for a clean slate
const filesToRemove = [
  'node_modules',
  'package-lock.json',
  'bun.lockb',
  'pnpm-lock.yaml',
  'yarn.lock',
];

for (const file of filesToRemove) {
  const fullPath = resolve(projectDir, file);
  if (existsSync(fullPath)) {
    console.log(`Removing ${file}...`);
    rmSync(fullPath, { recursive: true, force: true });
  }
}

console.log('Running npm install to generate a fresh package-lock.json...');
execSync('npm install --no-audit --no-fund', {
  cwd: projectDir,
  stdio: 'inherit',
  env: { ...process.env, npm_config_legacy_peer_deps: 'true' },
});

console.log('Done! package-lock.json is now in sync with package.json.');
