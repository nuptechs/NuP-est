#!/usr/bin/env node

/**
 * Script de validação de dependências do monorepo
 * Verifica se features/packages seguem as regras arquiteturais
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let errors = 0;
let warnings = 0;

/**
 * Descobre packages do workspace dinamicamente
 */
function discoverPackages() {
  const packages = [];
  const packagesDir = join(rootDir, 'packages/@nup');
  
  try {
    if (existsSync(packagesDir)) {
      const entries = readdirSync(packagesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          packages.push(`@nup/${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Descoberta de packages falhou, usando fallback');
  }
  
  // Fallback se descoberta falhar
  if (packages.length === 0) {
    packages.push('@nup/ui', '@nup/api-client', '@nup/auth-client', '@nup/shared-types');
  }
  
  return packages;
}

/**
 * Descobre features do workspace dinamicamente
 */
function discoverFeatures() {
  const features = [];
  const featuresDir = join(rootDir, 'features/@nup');
  
  try {
    if (existsSync(featuresDir)) {
      const entries = readdirSync(featuresDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          features.push(`@nup/${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Descoberta de features falhou, usando fallback');
  }
  
  // Fallback se descoberta falhar
  if (features.length === 0) {
    features.push('@nup/mindmaps', '@nup/professor-ia', '@nup/flashcards');
  }
  
  return features;
}

// Descobre packages e features uma vez no início
const KNOWN_PACKAGES = discoverPackages();
const KNOWN_FEATURES = discoverFeatures();

console.log('🔍 Validando dependências do monorepo...\n');
console.log(`📦 Packages descobertos: ${KNOWN_PACKAGES.join(', ')}`);
console.log(`🎨 Features descobertas: ${KNOWN_FEATURES.join(', ')}\n`);

/**
 * Valida package.json de um workspace
 */
function validatePackageJson(packagePath, type) {
  if (!existsSync(packagePath)) {
    return;
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const dependencies = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const depKeys = Object.keys(dependencies);
  
  // Filtra deps que são features (não packages)
  const featureDeps = depKeys.filter(d => 
    d.startsWith('@nup/') && 
    !KNOWN_PACKAGES.includes(d) &&
    KNOWN_FEATURES.some(feat => d === feat || d.startsWith(feat + '/'))
  );

  // Validação 1: Features não podem depender de outras features
  if (type === 'feature' && featureDeps.length > 0) {
    console.error(`❌ [${pkg.name}] Feature depende de outras features:`);
    featureDeps.forEach(dep => {
      console.error(`   - ${dep}`);
    });
    console.error(`   💡 Mova o código compartilhado para packages/@nup/\n`);
    errors++;
  }

  // Validação 2: Packages não podem depender de features
  if (type === 'package' && featureDeps.length > 0) {
    console.error(`❌ [${pkg.name}] Package depende de features:`);
    featureDeps.forEach(dep => {
      console.error(`   - ${dep}`);
    });
    console.error(`   💡 Packages são a base e não podem depender de features\n`);
    errors++;
  }

  // Validação 3: Services não podem ter deps do workspace
  if (type === 'service') {
    const workspaceDeps = depKeys.filter(d => d.startsWith('@nup/'));
    if (workspaceDeps.length > 0) {
      console.error(`❌ [${pkg.name}] Service depende de packages do workspace:`);
      workspaceDeps.forEach(dep => {
        console.error(`   - ${dep}`);
      });
      console.error(`   💡 Services devem ser isolados, use HTTP/API\n`);
      errors++;
    }
  }

  // Warning: Dependências não usadas no workspace
  if (type === 'feature' || type === 'package') {
    const workspaceDeps = depKeys.filter(d => d.includes('workspace:'));
    if (workspaceDeps.length === 0 && type === 'feature') {
      console.warn(`⚠️  [${pkg.name}] Feature não usa nenhum package do workspace`);
      console.warn(`   Isso pode estar correto, mas é incomum.\n`);
      warnings++;
    }
  }
}

/**
 * Valida todos os packages de um diretório
 */
function validateDirectory(dir, type) {
  if (!existsSync(dir)) {
    return;
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const packageJsonPath = join(dir, entry.name, 'package.json');
      validatePackageJson(packageJsonPath, type);
    }
  }
}

// Validar features
console.log('📦 Validando features/@nup/...');
validateDirectory(join(rootDir, 'features/@nup'), 'feature');

// Validar packages
console.log('📦 Validando packages/@nup/...');
validateDirectory(join(rootDir, 'packages/@nup'), 'package');

// Validar services
console.log('📦 Validando services/...');
validateDirectory(join(rootDir, 'services'), 'service');

// Relatório final
console.log('─'.repeat(60));
if (errors === 0 && warnings === 0) {
  console.log('✅ Validação completa! Nenhum problema encontrado.\n');
  process.exit(0);
} else {
  console.log(`\n📊 Resumo:`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log(`   ⚠️  Avisos: ${warnings}\n`);
  
  if (errors > 0) {
    console.log('💡 Consulte MONOREPO.md para entender as regras de dependência.\n');
    process.exit(1);
  } else {
    process.exit(0);
  }
}
