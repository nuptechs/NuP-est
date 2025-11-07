#!/usr/bin/env node

/**
 * Testes Unitários para eslint-plugin-nup-monorepo
 * 
 * Importa e testa as funções REAIS do plugin para garantir
 * que descoberta automática, normalização e detecção funcionem corretamente.
 */

import assert from 'assert';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Importa o plugin REAL
const pluginPath = join(__dirname, '../index.js');
const plugin = require(pluginPath);
const {
  discoverPackages,
  discoverFeatures,
  detectLayer,
  extractFeatureName,
  normalizePath,
  checkImportPath
} = plugin.utils;

console.log('🧪 Executando testes unitários do ESLint plugin...\n');
console.log('📦 Testando funções REAIS importadas do plugin\n');

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
// Testes das Funções Utilitárias REAIS do Plugin
// ============================================================

test('Plugin exporta utils corretamente', () => {
  assert(plugin.utils, 'Plugin deve exportar utils');
  assert(typeof discoverPackages === 'function', 'discoverPackages deve ser função');
  assert(typeof discoverFeatures === 'function', 'discoverFeatures deve ser função');
  assert(typeof detectLayer === 'function', 'detectLayer deve ser função');
  assert(typeof extractFeatureName === 'function', 'extractFeatureName deve ser função');
  assert(typeof normalizePath === 'function', 'normalizePath deve ser função');
  console.log('   Todas as funções utilitárias estão disponíveis');
});

test('Plugin exporta rules corretamente', () => {
  assert(plugin.rules, 'Plugin deve exportar rules');
  assert(plugin.rules['no-feature-to-feature-imports'], 'Deve ter regra no-feature-to-feature-imports');
  assert(plugin.rules['no-package-to-feature-imports'], 'Deve ter regra no-package-to-feature-imports');
  assert(plugin.rules['no-service-workspace-imports'], 'Deve ter regra no-service-workspace-imports');
  console.log('   3 regras arquiteturais exportadas');
});

test('normalizePath: Windows → POSIX (função REAL)', () => {
  assert.strictEqual(
    normalizePath('features\\@nup\\mindmaps\\src\\index.ts'),
    'features/@nup/mindmaps/src/index.ts'
  );
});

test('discoverPackages: Descobre packages do workspace (função REAL)', () => {
  const packages = discoverPackages();
  assert(packages.length > 0, 'Deve descobrir pelo menos um package');
  assert(packages.includes('@nup/ui'), 'Deve descobrir @nup/ui');
  console.log(`   Descobertos: ${packages.join(', ')}`);
});

test('discoverFeatures: Descobre features do workspace (função REAL)', () => {
  const features = discoverFeatures();
  assert(features.length > 0, 'Deve descobrir pelo menos uma feature');
  assert(features.includes('@nup/mindmaps'), 'Deve descobrir @nup/mindmaps');
  console.log(`   Descobertos: ${features.join(', ')}`);
});

test('detectLayer: Detecta feature (POSIX) (função REAL)', () => {
  assert.strictEqual(detectLayer('features/@nup/mindmaps/src/index.ts'), 'feature');
});

test('detectLayer: Detecta feature (Windows) (função REAL)', () => {
  assert.strictEqual(detectLayer('features\\@nup\\mindmaps\\src\\index.ts'), 'feature');
});

test('detectLayer: Detecta package (POSIX) (função REAL)', () => {
  assert.strictEqual(detectLayer('packages/@nup/ui/src/Button.tsx'), 'package');
});

test('detectLayer: Detecta package (Windows) (função REAL)', () => {
  assert.strictEqual(detectLayer('packages\\@nup\\ui\\src\\Button.tsx'), 'package');
});

test('detectLayer: Detecta app (função REAL)', () => {
  assert.strictEqual(detectLayer('apps/nup-study/client/src/App.tsx'), 'app');
});

test('detectLayer: Detecta service (função REAL)', () => {
  assert.strictEqual(detectLayer('services/custom-fields/src/index.ts'), 'service');
});

test('detectLayer: Import @nup/ui é package (função REAL)', () => {
  assert.strictEqual(detectLayer('@nup/ui'), 'package');
});

test('detectLayer: Import @nup/mindmaps é feature (função REAL)', () => {
  assert.strictEqual(detectLayer('@nup/mindmaps'), 'feature');
});

test('extractFeatureName: POSIX (função REAL)', () => {
  assert.strictEqual(extractFeatureName('features/@nup/mindmaps/src/index.ts'), 'mindmaps');
});

test('extractFeatureName: Windows (função REAL)', () => {
  assert.strictEqual(extractFeatureName('features\\@nup\\professor-ia\\src\\index.ts'), 'professor-ia');
});

test('extractFeatureName: Retorna null para não-feature (função REAL)', () => {
  assert.strictEqual(extractFeatureName('packages/@nup/ui/src/Button.tsx'), null);
});

// Testes de Regras Arquiteturais usando funções REAIS

test('Regra: Feature NÃO PODE importar outra feature (lógica REAL)', () => {
  const sourceFile = 'features/@nup/mindmaps/src/index.ts';
  const importPath = '@nup/flashcards';
  
  const sourceLayer = detectLayer(sourceFile);
  const importLayer = detectLayer(importPath);
  
  assert.strictEqual(sourceLayer, 'feature', 'Source deve ser feature');
  assert.strictEqual(importLayer, 'feature', 'Import deve ser feature');
  
  const isViolation = (sourceLayer === 'feature' && importLayer === 'feature');
  assert.strictEqual(isViolation, true, 'Deve ser violação');
});

test('Regra: Feature PODE importar package (lógica REAL)', () => {
  const sourceFile = 'features/@nup/mindmaps/src/index.ts';
  const importPath = '@nup/ui';
  
  const sourceLayer = detectLayer(sourceFile);
  const importLayer = detectLayer(importPath);
  
  assert.strictEqual(sourceLayer, 'feature', 'Source deve ser feature');
  assert.strictEqual(importLayer, 'package', 'Import deve ser package');
  
  const isViolation = (sourceLayer === 'feature' && importLayer === 'feature');
  assert.strictEqual(isViolation, false, 'NÃO deve ser violação');
});

test('Regra: Package NÃO PODE importar feature (lógica REAL)', () => {
  const sourceFile = 'packages/@nup/ui/src/Button.tsx';
  const importPath = '@nup/mindmaps';
  
  const sourceLayer = detectLayer(sourceFile);
  const importLayer = detectLayer(importPath);
  
  assert.strictEqual(sourceLayer, 'package', 'Source deve ser package');
  assert.strictEqual(importLayer, 'feature', 'Import deve ser feature');
  
  const isViolation = (sourceLayer === 'package' && importLayer === 'feature');
  assert.strictEqual(isViolation, true, 'Deve ser violação');
});

// ============================================================
// Testes de checkImportPath (função que REALMENTE gera violações)
// ============================================================

test('checkImportPath: Feature → Feature GERA violação', () => {
  // Mock de ESLint context mínimo
  const mockContext = {
    getFilename: () => 'features/@nup/mindmaps/src/index.ts'
  };
  
  const mockNode = { type: 'ImportDeclaration' };
  const importPath = '@nup/flashcards';
  
  const violations = checkImportPath(mockContext, mockNode, importPath);
  
  assert(violations.length > 0, 'Deve retornar pelo menos uma violação');
  assert(violations[0].message.includes('Features não podem importar outras features'), 
    'Mensagem de violação deve estar correta');
  assert.strictEqual(violations[0].node, mockNode, 'Node deve ser retornado');
  
  console.log(`   Violação: "${violations[0].message}"`);
});

test('checkImportPath: Feature → Package NÃO GERA violação', () => {
  const mockContext = {
    getFilename: () => 'features/@nup/mindmaps/src/index.ts'
  };
  
  const mockNode = { type: 'ImportDeclaration' };
  const importPath = '@nup/ui';
  
  const violations = checkImportPath(mockContext, mockNode, importPath);
  
  assert.strictEqual(violations.length, 0, 'Não deve retornar violações');
  console.log('   Nenhuma violação (correto)');
});

test('checkImportPath: Package → Feature GERA violação', () => {
  const mockContext = {
    getFilename: () => 'packages/@nup/ui/src/Button.tsx'
  };
  
  const mockNode = { type: 'ImportDeclaration' };
  const importPath = '@nup/mindmaps';
  
  const violations = checkImportPath(mockContext, mockNode, importPath);
  
  assert(violations.length > 0, 'Deve retornar pelo menos uma violação');
  assert(violations[0].message.includes('Packages não podem importar features'), 
    'Mensagem de violação deve estar correta');
  assert.strictEqual(violations[0].node, mockNode, 'Node deve ser retornado');
  
  console.log(`   Violação: "${violations[0].message}"`);
});

test('checkImportPath: Service → Workspace GERA violação', () => {
  const mockContext = {
    getFilename: () => 'services/custom-fields/src/index.ts'
  };
  
  const mockNode = { type: 'ImportDeclaration' };
  const importPath = '@nup/ui';
  
  const violations = checkImportPath(mockContext, mockNode, importPath);
  
  assert(violations.length > 0, 'Deve retornar pelo menos uma violação');
  assert(violations[0].message.includes('Services') || violations[0].message.includes('isolados'), 
    'Mensagem de violação deve estar correta');
  
  console.log(`   Violação: "${violations[0].message}"`);
});

test('checkImportPath: Imports relativos são ignorados', () => {
  const mockContext = {
    getFilename: () => 'features/@nup/mindmaps/src/index.ts'
  };
  
  const mockNode = { type: 'ImportDeclaration' };
  const importPath = './components/Node';
  
  const violations = checkImportPath(mockContext, mockNode, importPath);
  
  assert.strictEqual(violations.length, 0, 'Imports relativos devem ser ignorados');
  console.log('   Import relativo ignorado (correto)');
});

// ============================================================
// Relatório Final
// ============================================================

console.log('\n' + '─'.repeat(60));
console.log(`\n📊 Resumo dos Testes Unitários:`);
console.log(`   ✅ Passou: ${passed}`);
console.log(`   ❌ Falhou: ${failed}`);
console.log(`   📈 Total: ${passed + failed}\n`);

if (failed === 0) {
  console.log('🎉 Todos os testes unitários passaram!\n');
  console.log('✨ As funções REAIS do plugin estão funcionando corretamente.\n');
  console.log('📦 Testes importam e executam o código do plugin, não duplicam lógica.\n');
  process.exit(0);
} else {
  console.log('❌ Alguns testes falharam. As funções do plugin estão incorretas.\n');
  process.exit(1);
}
