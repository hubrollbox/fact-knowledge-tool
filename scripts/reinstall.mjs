import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { resolve } from 'path';

const projectDir = resolve('/vercel/share/v0-project');

console.log('Removing node_modules...');
rmSync(resolve(projectDir, 'node_modules'), { recursive: true, force: true });

const lockFile = resolve(projectDir, 'package-lock.json');
if (existsSync(lockFile)) {
  console.log('Removing package-lock.json...');
  rmSync(lockFile);
}

console.log('Running npm install to generate a fresh lock file...');
execSync('npm install', { cwd: projectDir, stdio: 'inherit' });

console.log('Done! package-lock.json is now in sync with package.json.');
