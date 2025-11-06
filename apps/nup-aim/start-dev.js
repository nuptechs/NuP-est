#!/usr/bin/env node

// Script para desenvolvimento usando o servidor unificado
import { spawn } from 'child_process';

console.log('🚀 Iniciando servidor unificado (Frontend + Backend na porta 5000)...\n');

const command = 'tsx';
const args = ['server/dev.ts'];

const proc = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env
  }
});

proc.on('error', (error) => {
  console.error('❌ Erro ao executar servidor unificado:', error.message);
  process.exit(1);
});

proc.on('exit', (code) => {
  console.log(`\n🛑 Servidor unificado finalizado com código: ${code}`);
  process.exit(code || 0);
});