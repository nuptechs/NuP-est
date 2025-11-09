#!/bin/bash
# Script para rodar TODOS os apps habilitados do monorepo
# Lê configuração dinâmica de workflows-config.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../workflows-config.json"

echo "🚀 Iniciando todos os apps do NuP Ecosystem..."
echo ""

# Verificar se config existe, senão gerar
if [ ! -f "$CONFIG_FILE" ]; then
  echo "📝 Gerando configuração de workflows..."
  node "$SCRIPT_DIR/manage-workflows.js" generate
  echo ""
fi

# Usar Node.js para rodar (mais robusto que shell parsing)
node "$SCRIPT_DIR/manage-workflows.js" run

echo ""
echo "✅ Todos os apps foram iniciados!"
