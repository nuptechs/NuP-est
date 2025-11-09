#!/usr/bin/env node

/**
 * 🚀 Gerenciador de Workflows para Apps do Monorepo
 * 
 * Sistema centralizado para descobrir, configurar e executar múltiplos apps
 * de forma escalável e automática.
 * 
 * Uso:
 *   node scripts/manage-workflows.js list       # Lista apps disponíveis
 *   node scripts/manage-workflows.js generate   # Gera configuração
 *   node scripts/manage-workflows.js run [app]  # Executa app(s)
 *   node scripts/manage-workflows.js info       # Informações
 */

import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const APPS_DIR = join(rootDir, 'apps');
const CONFIG_PATH = join(rootDir, 'workflows-config.json');

// Portas pré-configuradas para apps conhecidos
const KNOWN_PORTS = {
  'nup-study': 5000,
  'nup-aim': 3000,
  'impact-analysis-generator': 3000,
  'nup-identify': 5002,
  'nup-chunks': 5003,
  'nup-kan': 5004,
  'nup-service': 5005,
};

const MAX_PARALLEL_APPS = parseInt(process.env.MAX_APPS) || 10;

function discoverApps() {
  if (!existsSync(APPS_DIR)) {
    console.log('❌ Diretório apps/ não encontrado');
    return [];
  }

  const entries = readdirSync(APPS_DIR, { withFileTypes: true });
  const apps = [];
  let nextPort = 5006; // Porta inicial para apps não mapeados

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
      
      // Determinar porta: usa conhecida ou incrementa
      let port = KNOWN_PORTS[entry.name] || KNOWN_PORTS[packageJson.name];
      if (!port) {
        // Garantir que não conflita com portas conhecidas
        while (Object.values(KNOWN_PORTS).includes(nextPort)) {
          nextPort++;
        }
        port = nextPort++;
      }
      
      apps.push({
        id: entry.name, // ID único (nome do diretório)
        name: packageJson.name || entry.name, // Nome no package.json
        path: `apps/${entry.name}`,
        port: port,
        command: `cd apps/${entry.name} && PORT=${port} npm run dev`,
        hasDevScript: !!packageJson.scripts?.dev,
        enabled: true, // Flag para desabilitar apps
      });
    } catch (error) {
      console.warn(`⚠️  ${entry.name}: erro ao ler package.json`);
    }
  }

  return apps;
}

function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Erro ao ler workflows-config.json, regenerando...');
      return null;
    }
  }
  return null;
}

function saveConfig(apps) {
  writeFileSync(CONFIG_PATH, JSON.stringify(apps, null, 2), 'utf8');
  return CONFIG_PATH;
}

function getApps() {
  // Tenta carregar config existente, senão descobre
  let apps = loadConfig();
  if (!apps || apps.length === 0) {
    apps = discoverApps();
    if (apps.length > 0) {
      saveConfig(apps);
    }
  }
  return apps;
}

function listApps() {
  const apps = getApps();

  console.log('\n📦 Apps Disponíveis no Monorepo:\n');
  console.log('─'.repeat(70));

  if (apps.length === 0) {
    console.log('Nenhum app encontrado em apps/');
    return;
  }

  apps.forEach((app, index) => {
    const status = app.enabled ? '✅' : '⛔';
    const devStatus = app.hasDevScript ? '✅' : '❌';
    
    console.log(`${index + 1}. ${app.name} ${status}`);
    console.log(`   📁 ID: ${app.id}`);
    console.log(`   🔌 Porta: ${app.port}`);
    console.log(`   ${devStatus} Script dev ${app.hasDevScript ? 'encontrado' : 'não encontrado'}`);
    console.log(`   💻 Comando: ${app.command}`);
    console.log('');
  });

  console.log('─'.repeat(70));
  console.log(`\n✨ Total: ${apps.length} app(s) | Habilitados: ${apps.filter(a => a.enabled).length}`);
  console.log(`⚙️  Limite paralelo: ${MAX_PARALLEL_APPS} apps\n`);
}

function generateWorkflowsConfig() {
  const apps = discoverApps();

  if (apps.length === 0) {
    console.log('❌ Nenhum app encontrado para gerar workflows');
    return;
  }

  console.log('\n🔧 Gerando configuração de workflows...\n');
  
  const configPath = saveConfig(apps);
  
  console.log(`✅ Configuração salva em: ${configPath}\n`);
  
  console.log('📋 Workflows gerados:\n');
  apps.forEach((app, index) => {
    console.log(`${index + 1}. ${app.name}`);
    console.log(`   Comando: ${app.command}`);
    console.log(`   Porta: ${app.port}`);
    console.log('');
  });

  console.log('\n💡 Próximos passos:');
  console.log('   1. Configure workflows no Replit (Tools → Workflows)');
  console.log('   2. Ou use: ./scripts/run-all-apps.sh');
  console.log('   3. Ou use: node scripts/manage-workflows.js run [app-id]\n');

  return apps;
}

function runApp(appId) {
  const apps = getApps();
  const app = apps.find(a => a.id === appId || a.name === appId);

  if (!app) {
    console.error(`❌ App "${appId}" não encontrado\n`);
    console.log('Apps disponíveis:');
    apps.forEach(a => console.log(`  - ${a.id}`));
    process.exit(1);
  }

  if (!app.enabled) {
    console.error(`❌ App "${app.name}" está desabilitado`);
    process.exit(1);
  }

  if (!app.hasDevScript) {
    console.error(`❌ App "${app.name}" não tem script "dev"`);
    process.exit(1);
  }

  console.log(`🚀 Iniciando ${app.name} na porta ${app.port}...\n`);
  
  // Executar comando completo no shell
  const proc = spawn(app.command, [], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: String(app.port) }
  });

  proc.on('error', (error) => {
    console.error(`❌ Erro ao iniciar ${app.name}:`, error.message);
    process.exit(1);
  });

  proc.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${app.name} encerrou com código ${code}`);
      process.exit(code);
    }
  });
}

function runAllApps() {
  const apps = getApps().filter(a => a.enabled && a.hasDevScript);

  if (apps.length === 0) {
    console.error('❌ Nenhum app habilitado com script "dev"');
    process.exit(1);
  }

  if (apps.length > MAX_PARALLEL_APPS) {
    console.warn(`⚠️  Tentando rodar ${apps.length} apps, mas o limite é ${MAX_PARALLEL_APPS}`);
    console.warn(`   Defina MAX_APPS para aumentar: MAX_APPS=15 node scripts/manage-workflows.js run\n`);
  }

  const appsToRun = apps.slice(0, MAX_PARALLEL_APPS);
  
  console.log(`🚀 Iniciando ${appsToRun.length} app(s)...\n`);
  
  appsToRun.forEach(app => {
    console.log(`  - ${app.name} (porta ${app.port})`);
  });
  console.log('');

  // Usar concurrently se disponível
  try {
    const names = appsToRun.map(app => app.id).join(',');
    const commands = appsToRun.map(app => `"${app.command}"`);
    
    const proc = spawn('npx', [
      'concurrently',
      '-n', names,
      '-c', 'auto',
      ...commands
    ], {
      stdio: 'inherit',
      shell: true
    });

    proc.on('error', (error) => {
      console.error('❌ Erro ao usar concurrently:', error.message);
      console.log('Tentando execução sequencial...');
      runAppsSequentially(appsToRun);
    });

  } catch (error) {
    console.warn('⚠️  concurrently não disponível, rodando sequencialmente');
    runAppsSequentially(appsToRun);
  }
}

function runAppsSequentially(apps) {
  apps.forEach(app => {
    console.log(`\n🚀 Iniciando ${app.name}...`);
    spawn(app.command, [], {
      stdio: 'inherit',
      shell: true,
      detached: true,
      env: { ...process.env, PORT: String(app.port) }
    });
  });
}

function showInfo() {
  const apps = getApps();
  
  console.log('\n📊 Informações do Sistema de Workflows\n');
  console.log('─'.repeat(70));
  console.log(`📁 Diretório de apps: ${APPS_DIR}`);
  console.log(`📄 Arquivo de config: ${CONFIG_PATH}`);
  console.log(`🎯 Total de apps: ${apps.length}`);
  console.log(`✅ Apps habilitados: ${apps.filter(a => a.enabled).length}`);
  console.log(`⚙️  Limite paralelo: ${MAX_PARALLEL_APPS}`);
  console.log('─'.repeat(70));
  
  console.log('\n🔌 Mapa de Portas:\n');
  apps.forEach(app => {
    const status = app.enabled ? '✅' : '⛔';
    console.log(`  ${status} ${app.name.padEnd(30)} → porta ${app.port}`);
  });
  
  console.log('\n💡 Comandos disponíveis:\n');
  console.log('  node scripts/manage-workflows.js list       # Listar apps');
  console.log('  node scripts/manage-workflows.js generate   # Gerar config');
  console.log('  node scripts/manage-workflows.js run        # Rodar todos');
  console.log('  node scripts/manage-workflows.js run <id>   # Rodar app específico');
  console.log('  node scripts/manage-workflows.js info       # Esta tela\n');
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'list':
    listApps();
    break;
  case 'generate':
    generateWorkflowsConfig();
    break;
  case 'run':
    if (arg) {
      runApp(arg);
    } else {
      runAllApps();
    }
    break;
  case 'info':
    showInfo();
    break;
  default:
    console.log('\n🚀 Gerenciador de Workflows do NuP Ecosystem\n');
    console.log('Uso: node scripts/manage-workflows.js <comando> [args]\n');
    console.log('Comandos:');
    console.log('  list              Lista apps disponíveis');
    console.log('  generate          Gera workflows-config.json');
    console.log('  run               Roda todos os apps habilitados');
    console.log('  run <app-id>      Roda um app específico');
    console.log('  info              Mostra informações do sistema\n');
    break;
}
