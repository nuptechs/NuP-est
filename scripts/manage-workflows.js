#!/usr/bin/env node

/**
 * 🚀 Gerenciador de Workflows para Apps do Monorepo
 * 
 * Descobre apps automaticamente e gerencia workflows do Replit
 * de forma elegante e escalável.
 * 
 * Uso:
 *   node scripts/manage-workflows.js list      # Lista apps disponíveis
 *   node scripts/manage-workflows.js generate  # Gera configuração de workflows
 *   node scripts/manage-workflows.js info      # Mostra informações dos workflows
 */

import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const APPS_DIR = join(rootDir, 'apps');
const BASE_PORT = 5000;

function discoverApps() {
  if (!existsSync(APPS_DIR)) {
    console.log('❌ Diretório apps/ não encontrado');
    return [];
  }

  const entries = readdirSync(APPS_DIR, { withFileTypes: true });
  const apps = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const appPath = join(APPS_DIR, entry.name);
    const packageJsonPath = join(appPath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      console.warn(`⚠️  ${entry.name}: sem package.json, ignorando`);
      continue;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      apps.push({
        name: entry.name,
        displayName: packageJson.name || entry.name,
        path: `apps/${entry.name}`,
        hasDevScript: !!packageJson.scripts?.dev,
        port: BASE_PORT + apps.length,
      });
    } catch (error) {
      console.warn(`⚠️  ${entry.name}: erro ao ler package.json`);
    }
  }

  return apps;
}

function listApps() {
  const apps = discoverApps();

  console.log('\n📦 Apps Disponíveis no Monorepo:\n');
  console.log('─'.repeat(70));

  if (apps.length === 0) {
    console.log('Nenhum app encontrado em apps/');
    return;
  }

  apps.forEach((app, index) => {
    console.log(`${index + 1}. ${app.displayName}`);
    console.log(`   📁 Caminho: ${app.path}`);
    console.log(`   🔌 Porta sugerida: ${app.port}`);
    console.log(`   ${app.hasDevScript ? '✅' : '❌'} Script "dev" ${app.hasDevScript ? 'encontrado' : 'não encontrado'}`);
    console.log('');
  });

  console.log('─'.repeat(70));
  console.log(`\n✨ Total: ${apps.length} app(s)\n`);
}

function generateWorkflowsConfig() {
  const apps = discoverApps();

  if (apps.length === 0) {
    console.log('❌ Nenhum app encontrado para gerar workflows');
    return;
  }

  console.log('\n🔧 Gerando configuração de workflows...\n');

  const workflows = apps.map(app => ({
    name: `${app.displayName}`,
    command: `cd ${app.path} && PORT=${app.port} npm run dev`,
    port: app.port,
    path: app.path,
  }));

  const configPath = join(rootDir, 'workflows-config.json');
  writeFileSync(configPath, JSON.stringify(workflows, null, 2), 'utf8');

  console.log('✅ Configuração gerada em: workflows-config.json\n');
  
  console.log('📋 Workflows gerados:\n');
  workflows.forEach((wf, index) => {
    console.log(`${index + 1}. ${wf.name}`);
    console.log(`   Comando: ${wf.command}`);
    console.log(`   Porta: ${wf.port}`);
    console.log('');
  });

  console.log('\n💡 Próximos passos:');
  console.log('   1. Configure workflows manualmente no Replit baseado nesta saída');
  console.log('   2. Use o arquivo workflows-config.json como referência');
  console.log('   3. Ou execute apps individuais: npm run dev:nup-study\n');

  return workflows;
}

function showInfo() {
  const apps = discoverApps();

  console.log('\n📊 Informações dos Workflows\n');
  console.log('─'.repeat(70));
  
  console.log('\n🎯 Sistema de Workflows Automático');
  console.log('   • Apps descobertos automaticamente em apps/');
  console.log('   • Portas atribuídas sequencialmente (5000, 5001, 5002...)');
  console.log('   • Comandos gerados automaticamente');
  console.log('');

  console.log('📝 Como adicionar um novo app:');
  console.log('   1. Crie pasta em apps/novo-app/');
  console.log('   2. Adicione package.json com script "dev"');
  console.log('   3. Execute: node scripts/manage-workflows.js generate');
  console.log('   4. Configure o workflow no Replit');
  console.log('');

  console.log('🔧 Comandos disponíveis:');
  console.log('   node scripts/manage-workflows.js list      # Lista apps');
  console.log('   node scripts/manage-workflows.js generate  # Gera config');
  console.log('   node scripts/manage-workflows.js info      # Mostra este guia');
  console.log('');

  console.log('─'.repeat(70));
  console.log(`\n✨ ${apps.length} app(s) detectado(s)\n`);
}

const command = process.argv[2] || 'info';

switch (command) {
  case 'list':
    listApps();
    break;
  case 'generate':
    generateWorkflowsConfig();
    break;
  case 'info':
    showInfo();
    break;
  default:
    console.log('❌ Comando inválido. Use: list, generate ou info');
    process.exit(1);
}
