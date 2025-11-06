#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Iniciando todos os serviços...\n');

const services = [
  {
    name: '📱 Frontend (Vite)',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: __dirname,
    port: 5173,
    color: '\x1b[36m' // Cyan
  },
  {
    name: '⚙️  Backend Principal',
    command: 'tsx',
    args: ['server/index.ts'],
    cwd: __dirname,
    port: 3001,
    color: '\x1b[32m' // Green
  },
  {
    name: '📝 Custom Fields Service',
    command: 'node',
    args: ['custom-fields-service/src/server.js'],
    cwd: __dirname,
    port: 3002,
    color: '\x1b[33m' // Yellow
  },
  {
    name: '🔍 Field Extraction API',
    command: 'node',
    args: ['field-extraction-api/src/server.js'],
    cwd: __dirname,
    port: 3000,
    color: '\x1b[35m' // Magenta
  }
];

const processes = [];
const isProduction = process.env.NODE_ENV === 'production';

// Função para matar todos os processos
const killAll = () => {
  console.log('\n🛑 Parando todos os serviços...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill();
    }
  });
  process.exit(0);
};

// Capturar sinais de interrupção
process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

// Função para iniciar um serviço
const startService = (service) => {
  return new Promise((resolve, reject) => {
    console.log(`${service.color}▶️  Iniciando ${service.name} na porta ${service.port}...\x1b[0m`);
    
    const proc = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: service.port.toString()
      }
    });
    
    processes.push(proc);
    
    proc.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${service.color}[${service.name}]${service.color} ${output}\x1b[0m`);
      }
    });
    
    proc.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${service.color}[${service.name}]${service.color} ERROR: ${output}\x1b[0m`);
      }
    });
    
    proc.on('error', (error) => {
      console.error(`${service.color}❌ Erro ao iniciar ${service.name}: ${error.message}\x1b[0m`);
      reject(error);
    });
    
    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`${service.color}⚠️  ${service.name} parou com código ${code}\x1b[0m`);
      }
    });
    
    // Dar tempo para o serviço iniciar
    setTimeout(() => resolve(proc), 1000);
  });
};

// Função principal
const main = async () => {
  try {
    console.log('📊 Portas configuradas:');
    services.forEach(service => {
      console.log(`   ${service.name}: http://localhost:${service.port}`);
    });
    console.log('');

    // Iniciar todos os serviços
    for (const service of services) {
      await startService(service);
      // Pequena pausa entre cada serviço
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Todos os serviços foram iniciados!');
    console.log('🌐 URLs de acesso:');
    console.log('   Frontend: http://localhost:5173');
    console.log('   Backend Principal: http://localhost:3001/health');
    console.log('   Custom Fields: http://localhost:3002/health');
    console.log('   Field Extraction: http://localhost:3000/health');
    console.log('\n👀 Monitorando serviços... (Ctrl+C para parar todos)\n');
    
    // Manter o processo ativo
    const keepAlive = () => {
      setTimeout(keepAlive, 1000);
    };
    keepAlive();
    
  } catch (error) {
    console.error('❌ Erro ao iniciar os serviços:', error.message);
    killAll();
  }
};

main().catch(console.error);