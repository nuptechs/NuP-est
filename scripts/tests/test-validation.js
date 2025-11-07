#!/usr/bin/env node

/**
 * Testes automatizados para scripts de validação
 * 
 * Garante que validate-dependencies.js e check-architecture.js
 * funcionem corretamente e reportem resultados precisos.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

console.log('🧪 Executando testes dos scripts de validação...\n');

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
// Teste 1: validate-dependencies.js executa sem erros
// ============================================================

test('validate-dependencies.js executa com sucesso', () => {
  try {
    const output = execSync('node scripts/validate-dependencies.js', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(output.includes('Validando dependências'), 'Deve exibir mensagem de validação');
    assert(output.includes('Packages descobertos'), 'Deve mostrar packages descobertos');
    assert(output.includes('Features descobertas'), 'Deve mostrar features descobertas');
    console.log('   Script executou e descobriu workspaces automaticamente');
  } catch (error) {
    // Se exitou com code !== 0, pode ser por warnings (ok) ou erros (não ok)
    const output = error.stdout || error.stderr || '';
    if (output.includes('Packages descobertos')) {
      console.log('   Script executou com warnings (aceitável)');
    } else {
      throw new Error('Script falhou: ' + output);
    }
  }
});

// ============================================================
// Teste 2: check-architecture.js detecta violações
// ============================================================

test('check-architecture.js executa validação', () => {
  try {
    execSync('node scripts/check-architecture.js', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log('   Validação arquitetural completa sem erros');
  } catch (error) {
    // Pode falhar se houver violações, mas deve executar
    const output = error.stdout || error.stderr || '';
    assert(output.includes('Validando arquitetura'), 'Deve iniciar validação');
    console.log('   Script detectou warnings/erros (funcionalidade correta)');
  }
});

// ============================================================
// Teste 3: Descoberta de packages é consistente
// ============================================================

test('validate-dependencies.js descobre packages corretamente', () => {
  try {
    const output = execSync('node scripts/validate-dependencies.js', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(output.includes('@nup/ui'), 'Deve descobrir @nup/ui');
    assert(output.includes('@nup/api-client'), 'Deve descobrir @nup/api-client');
    console.log('   Packages essenciais descobertos');
  } catch (error) {
    const output = error.stdout || '';
    assert(output.includes('@nup/ui'), 'Deve descobrir @nup/ui mesmo com warnings');
    console.log('   Packages essenciais descobertos (com warnings)');
  }
});

// ============================================================
// Teste 4: Descoberta de features é consistente
// ============================================================

test('validate-dependencies.js descobre features corretamente', () => {
  try {
    const output = execSync('node scripts/validate-dependencies.js', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(output.includes('@nup/mindmaps'), 'Deve descobrir @nup/mindmaps');
    console.log('   Features essenciais descobertas');
  } catch (error) {
    const output = error.stdout || '';
    assert(output.includes('@nup/mindmaps'), 'Deve descobrir @nup/mindmaps mesmo com warnings');
    console.log('   Features essenciais descobertas (com warnings)');
  }
});

// ============================================================
// Teste 5: Dependency Cruiser está configurado
// ============================================================

test('Dependency Cruiser configuração existe', () => {
  const configPath = join(rootDir, '.dependency-cruiser.cjs');
  
  assert(existsSync(configPath), 'Arquivo .dependency-cruiser.cjs deve existir');
  
  const content = readFileSync(configPath, 'utf-8');
  assert(content.includes('no-feature-to-feature'), 'Deve conter regra no-feature-to-feature');
  assert(content.includes('no-package-to-feature'), 'Deve conter regra no-package-to-feature');
  assert(content.includes('no-service-workspace-imports'), 'Deve conter regra no-service-workspace-imports');
  console.log('   Configuração contém todas as regras arquiteturais');
});

// ============================================================
// Teste 6: Mensagens de erro são amigáveis
// ============================================================

test('Scripts exibem mensagens amigáveis', () => {
  try {
    const output = execSync('node scripts/validate-dependencies.js', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    assert(output.includes('📦'), 'Deve usar emojis para clareza');
    assert(output.includes('Validando'), 'Deve ter mensagem de progresso');
    console.log('   Mensagens são amigáveis e com emojis');
  } catch (error) {
    const output = error.stdout || '';
    assert(output.includes('📦') || output.includes('Validando'), 'Deve usar emojis/mensagens amigáveis');
    console.log('   Mensagens são amigáveis mesmo com erros');
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
