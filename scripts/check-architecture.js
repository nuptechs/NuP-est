#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Validando arquitetura do monorepo...\n');

const configPath = join(rootDir, '.dependency-cruiser.cjs');

if (!existsSync(configPath)) {
  console.error('❌ Arquivo de configuração .dependency-cruiser.cjs não encontrado');
  process.exit(1);
}

try {
  const command = `npx depcruise --config ${configPath} --output-type err-long apps features packages services`;
  
  execSync(command, {
    cwd: rootDir,
    stdio: 'inherit',
  });
  
  console.log('\n✅ Validação arquitetural completa! Nenhuma violação encontrada.\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Violações arquiteturais encontradas!\n');
  console.error('Por favor, corrija as violações acima antes de fazer commit.\n');
  console.error('💡 Dica: Consulte MONOREPO.md para entender as regras de dependência.\n');
  process.exit(1);
}
