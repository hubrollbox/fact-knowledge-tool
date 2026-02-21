const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

// Remove stale pnpm-lock.yaml
const pnpmLock = path.join(projectDir, 'pnpm-lock.yaml');
if (fs.existsSync(pnpmLock)) {
  fs.unlinkSync(pnpmLock);
  console.log('Deleted pnpm-lock.yaml');
}

// Remove stale bun.lockb
const bunLock = path.join(projectDir, 'bun.lockb');
if (fs.existsSync(bunLock)) {
  fs.unlinkSync(bunLock);
  console.log('Deleted bun.lockb');
}

// Remove stale package-lock.json if exists
const npmLock = path.join(projectDir, 'package-lock.json');
if (fs.existsSync(npmLock)) {
  fs.unlinkSync(npmLock);
  console.log('Deleted old package-lock.json');
}

// Generate a fresh package-lock.json
console.log('Running npm install to generate fresh package-lock.json...');
try {
  execSync('npm install --package-lock-only', {
    cwd: projectDir,
    stdio: 'inherit',
    env: { ...process.env, npm_config_fund: 'false', npm_config_audit: 'false' }
  });
  console.log('Successfully generated fresh package-lock.json');
} catch (err) {
  console.error('npm install failed, trying with --legacy-peer-deps...');
  try {
    execSync('npm install --package-lock-only --legacy-peer-deps', {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, npm_config_fund: 'false', npm_config_audit: 'false' }
    });
    console.log('Successfully generated fresh package-lock.json with --legacy-peer-deps');
  } catch (err2) {
    console.error('Failed to generate package-lock.json:', err2.message);
    process.exit(1);
  }
}
