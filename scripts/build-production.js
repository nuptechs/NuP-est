#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const nupStudyDir = path.join(rootDir, 'apps/nup-study');

console.log('🔨 Starting production build...\n');

try {
  console.log('📦 Building frontend (Vite) from apps/nup-study...');
  execSync('vite build', {
    cwd: nupStudyDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Frontend build complete\n');

  console.log('📂 Copying frontend build artifacts to root dist/...');
  const sourceDistPublic = path.join(nupStudyDir, 'dist/public');
  const targetDistPublic = path.join(rootDir, 'dist/public');
  
  if (fs.existsSync(sourceDistPublic)) {
    console.log(`✅ Frontend artifacts found at ${sourceDistPublic}`);
    
    fs.mkdirSync(path.join(rootDir, 'dist'), { recursive: true });
    
    execSync(`cp -r "${sourceDistPublic}" "${path.join(rootDir, 'dist')}"`, {
      stdio: 'inherit'
    });
    console.log(`✅ Frontend artifacts copied to ${targetDistPublic}\n`);
  } else {
    throw new Error(`Frontend build artifacts not found at ${sourceDistPublic}`);
  }

  console.log('🔧 Building backend (esbuild)...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('✅ Backend build complete\n');

  console.log('✅ Production build successful!');
  console.log(`📂 Build output: ${path.join(rootDir, 'dist')}`);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
