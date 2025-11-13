#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, rmSync, cpSync, mkdirSync } from 'fs';
import { join } from 'path';

const APPS = ['nup-study', 'nup-identify', 'nup-aim'];
const PRIMARY_APP = 'nup-study';

console.log('🏗️  Starting monorepo build orchestration...\n');

console.log('🧹 Step 1: Cleaning previous build artifacts...');
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
  console.log('   ✓ Removed dist/');
}

console.log('\n📦 Step 2: Building all apps...');
for (const app of APPS) {
  const appPath = join('apps', app);
  const viteConfig = join(appPath, 'vite.config.ts');
  
  if (!existsSync(viteConfig)) {
    console.log(`   ⚠️  Skipping ${app} (no vite.config.ts found)`);
    continue;
  }
  
  console.log(`   🔨 Building ${app}...`);
  try {
    execSync(`vite build --config ${viteConfig}`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log(`   ✓ ${app} built successfully`);
  } catch (error) {
    console.error(`   ❌ Failed to build ${app}`);
    process.exit(1);
  }
}

console.log('\n📋 Step 3: Copying primary app assets to dist/public...');
const primaryAppDist = join('apps', PRIMARY_APP, 'dist', 'public');
const targetDist = join('dist', 'public');

if (!existsSync(primaryAppDist)) {
  console.error(`   ❌ Primary app dist not found: ${primaryAppDist}`);
  process.exit(1);
}

mkdirSync('dist', { recursive: true });
cpSync(primaryAppDist, targetDist, { recursive: true });
console.log(`   ✓ Copied ${PRIMARY_APP} assets to dist/public/`);

console.log('\n🔧 Step 4: Bundling server with esbuild...');
try {
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
    stdio: 'inherit'
  });
  console.log('   ✓ Server bundled successfully');
} catch (error) {
  console.error('   ❌ Failed to bundle server');
  process.exit(1);
}

console.log('\n✅ Build completed successfully!');
console.log(`\n📊 Build Summary:`);
console.log(`   - Apps built: ${APPS.join(', ')}`);
console.log(`   - Primary app: ${PRIMARY_APP}`);
console.log(`   - Output: dist/public/ (frontend), dist/index.js (backend)`);
