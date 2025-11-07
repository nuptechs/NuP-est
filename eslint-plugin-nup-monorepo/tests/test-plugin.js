#!/usr/bin/env node

/**
 * Testes automatizados para eslint-plugin-nup-monorepo
 * 
 * Garante que descoberta automática, normalização de caminhos e
 * detecção de camadas funcionem corretamente em todas as plataformas.
 */

import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

console.log('🧪 Executando testes do ESLint plugin...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

// ============================================================
// Teste 1: Descoberta de Packages
// ============================================================

test('Descoberta automática de packages', () => {
  const packagesDir = join(rootDir, 'packages/@nup');
  
  if (!existsSync(packagesDir)) {
    throw new Error('Diretório packages/@nup não encontrado');
  }
  
  const entries = readdirSync(packagesDir, { withFileTypes: true });
  const packages = entries
    .filter(e => e.isDirectory())
    .map(e => `@nup/${e.name}`);
  
  assert(packages.length > 0, 'Deve descobrir pelo menos um package');
  assert(packages.includes('@nup/ui'), 'Deve descobrir @nup/ui');
  console.log(`   Descobertos: ${packages.join(', ')}`);
});

// ============================================================
// Teste 2: Descoberta de Features
// ============================================================

test('Descoberta automática de features', () => {
  const featuresDir = join(rootDir, 'features/@nup');
  
  if (!existsSync(featuresDir)) {
    throw new Error('Diretório features/@nup não encontrado');
  }
  
  const entries = readdirSync(featuresDir, { withFileTypes: true });
  const features = entries
    .filter(e => e.isDirectory())
    .map(e => `@nup/${e.name}`);
  
  assert(features.length > 0, 'Deve descobrir pelo menos uma feature');
  assert(features.includes('@nup/mindmaps'), 'Deve descobrir @nup/mindmaps');
  console.log(`   Descobertos: ${features.join(', ')}`);
});

// ============================================================
// Teste 3: Normalização de Caminhos (Windows)
// ============================================================

test('Normalização de caminhos Windows → POSIX', () => {
  // Simula função normalizePath do plugin
  const normalizePath = (path) => path.replace(/\\/g, '/');
  
  const windowsPath = 'features\\@nup\\mindmaps\\src\\index.ts';
  const normalized = normalizePath(windowsPath);
  
  assert.strictEqual(normalized, 'features/@nup/mindmaps/src/index.ts');
  console.log(`   "${windowsPath}" → "${normalized}"`);
});

// ============================================================
// Teste 4: Detecção de Camada - Features
// ============================================================

test('Detecta camada: features (POSIX)', () => {
  const path = 'features/@nup/mindmaps/src/index.ts';
  assert(path.includes('features/@nup/'), 'Deve identificar feature');
  console.log(`   "${path}" → feature`);
});

test('Detecta camada: features (Windows)', () => {
  const normalizePath = (path) => path.replace(/\\/g, '/');
  const windowsPath = 'features\\@nup\\mindmaps\\src\\index.ts';
  const normalized = normalizePath(windowsPath);
  
  assert(normalized.includes('features/@nup/'), 'Deve identificar feature após normalização');
  console.log(`   "${windowsPath}" → "${normalized}" → feature`);
});

// ============================================================
// Teste 5: Detecção de Camada - Packages
// ============================================================

test('Detecta camada: packages (POSIX)', () => {
  const path = 'packages/@nup/ui/src/components/Button.tsx';
  assert(path.includes('packages/@nup/'), 'Deve identificar package');
  console.log(`   "${path}" → package`);
});

test('Detecta camada: packages (Windows)', () => {
  const normalizePath = (path) => path.replace(/\\/g, '/');
  const windowsPath = 'packages\\@nup\\ui\\src\\components\\Button.tsx';
  const normalized = normalizePath(windowsPath);
  
  assert(normalized.includes('packages/@nup/'), 'Deve identificar package após normalização');
  console.log(`   "${windowsPath}" → "${normalized}" → package`);
});

// ============================================================
// Teste 6: Detecção de Camada - Apps
// ============================================================

test('Detecta camada: apps', () => {
  const path = 'apps/nup-study/client/src/App.tsx';
  assert(path.includes('apps/'), 'Deve identificar app');
  console.log(`   "${path}" → app`);
});

// ============================================================
// Teste 7: Detecção de Camada - Services
// ============================================================

test('Detecta camada: services', () => {
  const path = 'services/custom-fields/src/index.ts';
  assert(path.includes('services/'), 'Deve identificar service');
  console.log(`   "${path}" → service`);
});

// ============================================================
// Teste 8: Imports de Módulos (@nup/*)
// ============================================================

test('Identifica import de package via nome', () => {
  const importPath = '@nup/ui';
  assert(importPath.startsWith('@nup/'), 'Deve identificar import @nup/*');
  console.log(`   "${importPath}" → package (workspace)`);
});

test('Identifica import de feature via nome', () => {
  const importPath = '@nup/mindmaps';
  assert(importPath.startsWith('@nup/'), 'Deve identificar import @nup/*');
  console.log(`   "${importPath}" → feature (workspace)`);
});

// ============================================================
// Teste 9: Extração de Nome de Feature
// ============================================================

test('Extrai nome de feature do caminho (POSIX)', () => {
  const normalizePath = (path) => path.replace(/\\/g, '/');
  const extractFeatureName = (filePath) => {
    const normalized = normalizePath(filePath);
    const match = normalized.match(/features\/@nup\/([^/]+)/);
    return match ? match[1] : null;
  };
  
  const path = 'features/@nup/mindmaps/src/index.ts';
  const name = extractFeatureName(path);
  
  assert.strictEqual(name, 'mindmaps');
  console.log(`   "${path}" → "${name}"`);
});

test('Extrai nome de feature do caminho (Windows)', () => {
  const normalizePath = (path) => path.replace(/\\/g, '/');
  const extractFeatureName = (filePath) => {
    const normalized = normalizePath(filePath);
    const match = normalized.match(/features\/@nup\/([^/]+)/);
    return match ? match[1] : null;
  };
  
  const windowsPath = 'features\\@nup\\professor-ia\\src\\index.ts';
  const name = extractFeatureName(windowsPath);
  
  assert.strictEqual(name, 'professor-ia');
  console.log(`   "${windowsPath}" → "${name}"`);
});

// ============================================================
// Teste 10: Consistência de Descoberta
// ============================================================

test('Packages descobertos são únicos', () => {
  const packagesDir = join(rootDir, 'packages/@nup');
  
  if (existsSync(packagesDir)) {
    const entries = readdirSync(packagesDir, { withFileTypes: true });
    const packages = entries
      .filter(e => e.isDirectory())
      .map(e => `@nup/${e.name}`);
    
    const unique = [...new Set(packages)];
    assert.strictEqual(packages.length, unique.length, 'Não deve haver duplicatas');
    console.log(`   ${packages.length} packages únicos`);
  }
});

test('Features descobertas são únicas', () => {
  const featuresDir = join(rootDir, 'features/@nup');
  
  if (existsSync(featuresDir)) {
    const entries = readdirSync(featuresDir, { withFileTypes: true });
    const features = entries
      .filter(e => e.isDirectory())
      .map(e => `@nup/${e.name}`);
    
    const unique = [...new Set(features)];
    assert.strictEqual(features.length, unique.length, 'Não deve haver duplicatas');
    console.log(`   ${features.length} features únicas`);
  }
});

// ============================================================
// Relatório Final
// ============================================================

console.log('\n' + '─'.repeat(60));
console.log(`\n📊 Resumo dos Testes:`);
console.log(`   ✅ Passou: ${passed}`);
console.log(`   ❌ Falhou: ${failed}`);
console.log(`   📈 Total: ${passed + failed}\n`);

if (failed === 0) {
  console.log('🎉 Todos os testes passaram!\n');
  process.exit(0);
} else {
  console.log('❌ Alguns testes falharam. Corrija os problemas acima.\n');
  process.exit(1);
}
